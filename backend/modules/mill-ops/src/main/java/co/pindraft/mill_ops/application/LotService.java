package co.pindraft.mill_ops.application;

import co.pindraft.billing.PricingArrangementLookup;
import co.pindraft.identity.domain.TenantCustomerEntity;
import co.pindraft.identity.infrastructure.TenantCustomerRepository;
import co.pindraft.mill_ops.domain.*;
import co.pindraft.mill_ops.events.LotCompletedEvent;
import co.pindraft.mill_ops.events.LotIntakedEvent;
import co.pindraft.mill_ops.events.LotStageTransitionedEvent;
import co.pindraft.mill_ops.infrastructure.*;
import co.pindraft.pools.PoolReader;
import co.pindraft.traceability.TraceEmitter;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.jspecify.annotations.Nullable;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Lot lifecycle service. Owns the two key transactions from the spec:
 * intake (reservation → lot) and stage transition (lot → next stage).
 *
 * <p>Intake optionally accepts a {@code poolId} to link the new lot back to the pool
 * its fiber came from. Pool revenue settles per-lot rather than per-pool-as-a-whole
 * when this link is present.
 */
@Service
public class LotService {

    private final LotRepository lots;
    private final ReservationRepository reservations;
    private final WorkflowStageRepository workflowStages;
    private final LotStageEventRepository stageEvents;
    private final IntakeFleeceRepository intakeFleeces;
    private final ScanEventRepository scanEvents;
    private final co.pindraft.mill_ops.infrastructure.LotLineageRepository lineage;
    private final PricingArrangementLookup pricingLookup;
    private final EquipmentRunService equipmentRunService;
    private final TenantCustomerRepository customers;
    private final TraceEmitter traceEmitter;
    private final PoolReader poolReader;
    private final ApplicationEventPublisher eventPublisher;

    public LotService(
        LotRepository lots,
        ReservationRepository reservations,
        WorkflowStageRepository workflowStages,
        LotStageEventRepository stageEvents,
        IntakeFleeceRepository intakeFleeces,
        ScanEventRepository scanEvents,
        co.pindraft.mill_ops.infrastructure.LotLineageRepository lineage,
        PricingArrangementLookup pricingLookup,
        EquipmentRunService equipmentRunService,
        TenantCustomerRepository customers,
        TraceEmitter traceEmitter,
        PoolReader poolReader,
        ApplicationEventPublisher eventPublisher
    ) {
        this.lots = lots;
        this.reservations = reservations;
        this.workflowStages = workflowStages;
        this.stageEvents = stageEvents;
        this.intakeFleeces = intakeFleeces;
        this.scanEvents = scanEvents;
        this.lineage = lineage;
        this.pricingLookup = pricingLookup;
        this.equipmentRunService = equipmentRunService;
        this.customers = customers;
        this.traceEmitter = traceEmitter;
        this.poolReader = poolReader;
        this.eventPublisher = eventPublisher;
    }

    public List<LotEntity> listForTenant(UUID tenantId) {
        return lots.findByTenantIdOrderByCreatedAtDesc(tenantId);
    }

    public List<LotEntity> listForPool(UUID poolId) {
        return lots.findByPoolIdOrderByCreatedAtDesc(poolId);
    }

    public LotEntity getOne(UUID tenantId, UUID id) {
        var lot = lots.findById(id).orElseThrow(() -> new LotNotFoundException(id));
        if (!lot.getTenantId().equals(tenantId)) throw new LotNotFoundException(id);
        return lot;
    }

    public List<IntakeFleeceEntity> fleecesForLot(UUID lotId) {
        return intakeFleeces.findByLotId(lotId);
    }

    public List<LotStageEventEntity> historyForLot(UUID lotId) {
        return stageEvents.findByLotIdOrderByEnteredAt(lotId);
    }

    public List<ScanEventEntity> scansForLot(UUID lotId) {
        return scanEvents.findByLotIdOrderByScannedAtDesc(lotId);
    }

    @Transactional
    public LotEntity intake(
        UUID tenantId, UUID reservationId, List<FleeceInput> fleeces,
        @Nullable UUID poolId, @Nullable UUID operatorId
    ) {
        var reservation = reservations.findById(reservationId)
            .orElseThrow(() -> new ReservationNotFoundException(reservationId));
        if (!reservation.getTenantId().equals(tenantId)) {
            throw new ReservationNotFoundException(reservationId);
        }
        if (reservation.getStatus() != ReservationStatus.PENDING) {
            throw new InvalidReservationStateException(reservation.getStatus(), "intake");
        }
        if (fleeces == null || fleeces.isEmpty()) {
            throw new EmptyIntakeException();
        }

        var intakeStage = workflowStages.findByTenantIdOrderByOrderIndex(tenantId).stream()
            .filter(s -> "INTAKE".equals(s.getStageType()))
            .findFirst()
            .orElseThrow(MissingIntakeStageException::new);

        var lot = new LotEntity(UUID.randomUUID(), tenantId, reservation.getCustomerId());
        lot.linkToReservation(reservation.getId());
        if (poolId != null) lot.linkToPool(poolId);
        lot.setCurrentStageId(intakeStage.getId());

        if (reservation.getPricingArrangementId() != null) {
            pricingLookup.snapshot(reservation.getPricingArrangementId())
                .ifPresent(s -> lot.snapshotPricing(s.id(), s.kind(), s.configJson()));
        }

        var totalWeight = fleeces.stream()
            .map(FleeceInput::weightKg)
            .reduce(BigDecimal.ZERO, BigDecimal::add);
        lot.setIntakeWeight(totalWeight);
        lots.save(lot);

        var event = new LotStageEventEntity(
            UUID.randomUUID(), lot.getId(), intakeStage.getId(), totalWeight, operatorId);
        stageEvents.save(event);

        for (FleeceInput input : fleeces) {
            var fleece = new IntakeFleeceEntity(
                UUID.randomUUID(), lot.getId(), input.weightKg(), input.sourceAnimalName());
            fleece.setNotes(input.notes());
            fleece.setBreedCode(input.breedCode());
            intakeFleeces.save(fleece);
        }

        reservation.markReceived();
        reservations.save(reservation);

        var customerName = customers.findById(reservation.getCustomerId())
            .map(this::resolveDisplayName)
            .orElse("Unknown customer");
        traceEmitter.emitIntake(new TraceEmitter.IntakeData(
            lot.getId(), customerName, totalWeight));

        eventPublisher.publishEvent(new LotIntakedEvent(
            lot.getId(), tenantId, reservation.getCustomerId(),
            reservation.getId(), reservation.getExternalShipmentId(),
            totalWeight, Instant.now()));

        return lot;
    }

    /**
     * Walk-in intake: a lot enters the mill without a prior reservation. The operator
     * picks the customer (existing tenant_customers row) and pricing arrangement at
     * intake time. Mirrors {@link #intake} exactly except there is no reservation to
     * mark received, no external_shipment_id, and the operator must supply
     * pricingArrangementId directly.
     */
    @Transactional
    public LotEntity walkInIntake(
        UUID tenantId, UUID customerId, List<FleeceInput> fleeces,
        @Nullable UUID pricingArrangementId, @Nullable UUID poolId, @Nullable UUID operatorId
    ) {
        if (fleeces == null || fleeces.isEmpty()) {
            throw new EmptyIntakeException();
        }
        var customer = customers.findById(customerId)
            .orElseThrow(() -> new IllegalArgumentException("customer not found: " + customerId));
        if (!customer.getTenantId().equals(tenantId)) {
            throw new IllegalArgumentException("customer does not belong to this tenant");
        }

        var intakeStage = workflowStages.findByTenantIdOrderByOrderIndex(tenantId).stream()
            .filter(s -> "INTAKE".equals(s.getStageType()))
            .findFirst()
            .orElseThrow(MissingIntakeStageException::new);

        var lot = new LotEntity(UUID.randomUUID(), tenantId, customerId);
        if (poolId != null) lot.linkToPool(poolId);
        lot.setCurrentStageId(intakeStage.getId());

        if (pricingArrangementId != null) {
            pricingLookup.snapshot(pricingArrangementId)
                .ifPresent(s -> lot.snapshotPricing(s.id(), s.kind(), s.configJson()));
        }

        var totalWeight = fleeces.stream()
            .map(FleeceInput::weightKg)
            .reduce(BigDecimal.ZERO, BigDecimal::add);
        lot.setIntakeWeight(totalWeight);
        lots.save(lot);

        var event = new LotStageEventEntity(
            UUID.randomUUID(), lot.getId(), intakeStage.getId(), totalWeight, operatorId);
        stageEvents.save(event);

        for (FleeceInput input : fleeces) {
            var fleece = new IntakeFleeceEntity(
                UUID.randomUUID(), lot.getId(), input.weightKg(), input.sourceAnimalName());
            fleece.setNotes(input.notes());
            fleece.setBreedCode(input.breedCode());
            intakeFleeces.save(fleece);
        }

        var customerName = resolveDisplayName(customer);
        traceEmitter.emitIntake(new TraceEmitter.IntakeData(
            lot.getId(), customerName, totalWeight));

        // Same event as the reservation path, but with null reservationId/externalShipmentId
        // — listeners (interop's webhook dispatcher) already handle nullable fields.
        eventPublisher.publishEvent(new LotIntakedEvent(
            lot.getId(), tenantId, customerId,
            null, null,
            totalWeight, Instant.now()));

        return lot;
    }

    @Transactional
    public LotEntity transitionToNextStage(
        UUID tenantId, UUID lotId, @Nullable UUID targetStageId,
        BigDecimal weightOut, @Nullable UUID equipmentId, @Nullable String notes,
        @Nullable UUID operatorId
    ) {
        var lot = getOne(tenantId, lotId);
        if (lot.getStatus() != LotStatus.ACTIVE) {
            throw new InvalidLotStateException(lot.getStatus(), "transition");
        }
        if (lot.getCurrentStageId() == null) {
            throw new InvalidLotStateException(lot.getStatus(), "transition (no current stage)");
        }

        var openEvent = stageEvents.findOpenForLot(lotId)
            .orElseThrow(() -> new InvalidLotStateException(lot.getStatus(), "transition (no open stage event)"));

        var stages = workflowStages.findByTenantIdOrderByOrderIndex(tenantId);
        var currentIndex = -1;
        WorkflowStageEntity currentStage = null;
        for (int i = 0; i < stages.size(); i++) {
            if (stages.get(i).getId().equals(lot.getCurrentStageId())) {
                currentIndex = i;
                currentStage = stages.get(i);
                break;
            }
        }
        WorkflowStageEntity nextStage;
        if (targetStageId != null) {
            nextStage = stages.stream()
                .filter(s -> s.getId().equals(targetStageId))
                .findFirst()
                .orElseThrow(() -> new WorkflowStageNotFoundException(targetStageId));
        } else if (currentIndex == -1 || currentIndex == stages.size() - 1) {
            throw new NoNextStageException(lot.getCurrentStageId());
        } else {
            nextStage = stages.get(currentIndex + 1);
        }

        openEvent.close(weightOut);
        stageEvents.save(openEvent);

        var newEvent = new LotStageEventEntity(
            UUID.randomUUID(), lotId, nextStage.getId(), weightOut, operatorId);
        stageEvents.save(newEvent);

        lot.setCurrentStageId(nextStage.getId());
        lots.save(lot);

        var scan = new ScanEventEntity(
            UUID.randomUUID(), lotId, operatorId, "STAGE_TRANSITION", notes);
        scanEvents.save(scan);

        if (equipmentId != null) {
            var run = equipmentRunService.findOrStartOpenRun(tenantId, equipmentId, operatorId);
            equipmentRunService.attachLotToRun(run.getId(), lotId, weightOut);
        }

        traceEmitter.emitStageTransition(lotId, nextStage.getStageType(), weightOut);

        eventPublisher.publishEvent(new LotStageTransitionedEvent(
            lotId, tenantId,
            currentStage != null ? currentStage.getStageType() : "UNKNOWN",
            nextStage.getStageType(),
            weightOut, Instant.now()));

        return lot;
    }

    @Transactional
    public ScanEventEntity recordScan(UUID tenantId, UUID lotId, String scanKind, @Nullable String notes, @Nullable UUID operatorId) {
        getOne(tenantId, lotId);
        var scan = new ScanEventEntity(UUID.randomUUID(), lotId, operatorId, scanKind, notes);
        return scanEvents.save(scan);
    }

    /**
     * Mark a lot complete. Closes the open stage event with the final weight (the
     * weight_out reconciliation the spec calls for at SHIP), flips lot.status to
     * COMPLETED, and emits {@link LotCompletedEvent} so billing can generate the
     * invoice off the snapshotted pricing arrangement.
     *
     * @param finalWeightKg final weight_out for the closing stage. Null defers to
     *                      whatever was in weight_in for the open stage event.
     */
    @Transactional
    public LotEntity completeLot(
        UUID tenantId, UUID lotId, @Nullable BigDecimal finalWeightKg, @Nullable UUID operatorId
    ) {
        var lot = getOne(tenantId, lotId);
        if (lot.getStatus() != LotStatus.ACTIVE) {
            throw new InvalidLotStateException(lot.getStatus(), "complete");
        }

        // Close whatever stage is open. completeLot is end-of-line — no new stage opens.
        var openEvent = stageEvents.findOpenForLot(lotId).orElse(null);
        BigDecimal weightOut = finalWeightKg;
        if (openEvent != null) {
            if (weightOut == null) weightOut = openEvent.getWeightInKg();
            openEvent.close(weightOut);
            stageEvents.save(openEvent);
        }

        lot.markCompleted();
        lots.save(lot);

        // Audit trail — operator-initiated completion shows up in scans like any other action.
        var scan = new ScanEventEntity(
            UUID.randomUUID(), lotId, operatorId, "LOT_COMPLETED", null);
        scanEvents.save(scan);

        eventPublisher.publishEvent(new LotCompletedEvent(
            lotId, tenantId, lot.getCustomerId(),
            lot.getWeightIntakeKg(), weightOut,
            lot.getPricingKindSnapshot(), lot.getPricingConfigSnapshot(),
            Instant.now()));

        return lot;
    }

    private String resolveDisplayName(TenantCustomerEntity tc) {
        if (tc.getDisplayName() != null && !tc.getDisplayName().isBlank()) {
            return tc.getDisplayName();
        }
        return "Customer";
    }

    /**
     * Process a pool into a single new lot — the spec's wool-pool batching pattern:
     * "moving to PROCESSING creates a single new lot with lineage links from each
     * contribution".
     *
     * <p>The new lot is owned (in the {@code customer_id} sense) by the first
     * contribution's customer; the canonical anchor is the {@code pool_id} link.
     * For each contribution that carries a {@code sourceLotId} (the partial-handoff
     * case), a MERGE row is written into {@code lot_lineage_links} so trace records
     * walk backwards from the pooled lot to each upstream lot.
     */
    @Transactional
    public LotEntity intakeFromPool(UUID tenantId, UUID poolId, @Nullable UUID operatorId) {
        var pool = poolReader.findPool(poolId)
            .orElseThrow(() -> new IllegalArgumentException("pool not found: " + poolId));
        if (!pool.tenantId().equals(tenantId)) {
            throw new IllegalArgumentException("pool does not belong to this tenant");
        }
        var contributions = poolReader.findContributions(poolId);
        if (contributions.isEmpty()) {
            throw new IllegalArgumentException("pool has no contributions");
        }

        var intakeStage = workflowStages.findByTenantIdOrderByOrderIndex(tenantId).stream()
            .filter(s -> "INTAKE".equals(s.getStageType()))
            .findFirst()
            .orElseThrow(MissingIntakeStageException::new);

        var totalWeight = contributions.stream()
            .map(PoolReader.PoolContribution::weightKg)
            .reduce(BigDecimal.ZERO, BigDecimal::add);

        // The pooled lot is anchored by pool_id; customer_id is required by the schema
        // so we pin it to the first contributor for v1. Spec calls for the pool record
        // to be the operational owner — pool_id carries that.
        var anchorCustomerId = contributions.get(0).customerId();
        var lot = new LotEntity(UUID.randomUUID(), tenantId, anchorCustomerId);
        lot.linkToPool(poolId);
        lot.setCurrentStageId(intakeStage.getId());
        lot.setIntakeWeight(totalWeight);
        lots.save(lot);

        var event = new LotStageEventEntity(
            UUID.randomUUID(), lot.getId(), intakeStage.getId(), totalWeight, operatorId);
        stageEvents.save(event);

        // MERGE lineage rows for every contribution that carried a source lot.
        for (var c : contributions) {
            if (c.sourceLotId() != null) {
                lineage.save(new LotLineageEntity(
                    UUID.randomUUID(), c.sourceLotId(), lot.getId(), LotLineageTransition.MERGE));
            }
        }

        traceEmitter.emitIntake(new TraceEmitter.IntakeData(
            lot.getId(), "Pool: " + pool.name(), totalWeight));

        eventPublisher.publishEvent(new LotIntakedEvent(
            lot.getId(), tenantId, anchorCustomerId,
            null, null,
            totalWeight, Instant.now()));

        return lot;
    }

    /**
     * Split a lot into N child lots. The spec's "lots may split at the spinning stage"
     * pattern: one big lot becomes two or more smaller lots heading to different
     * end-products. Each child inherits the parent's tenant, customer, current stage,
     * and pricing snapshot; each gets its own open stage event; the parent is closed
     * and marked COMPLETED. Lineage rows tie parent → each child with SPLIT kind so
     * trace records walk backwards from the new lots to the original source.
     *
     * <p>The corresponding MERGE side (pool processing combining contributions into a
     * single pooled lot) needs a schema change on pool_contributions to track source
     * lot ids; deferred until that's designed.
     */
    @Transactional
    public List<LotEntity> splitLot(
        UUID tenantId, UUID parentLotId, List<SplitChild> splits, @Nullable UUID operatorId
    ) {
        if (splits == null || splits.size() < 2) {
            throw new IllegalArgumentException("split requires at least 2 children");
        }
        var parent = getOne(tenantId, parentLotId);
        if (parent.getStatus() != LotStatus.ACTIVE) {
            throw new InvalidLotStateException(parent.getStatus(), "split");
        }
        if (parent.getCurrentStageId() == null) {
            throw new InvalidLotStateException(parent.getStatus(), "split (no current stage)");
        }

        // Close the parent's open stage event with whatever weight is currently on it.
        stageEvents.findOpenForLot(parentLotId).ifPresent(open -> {
            open.close(open.getWeightInKg());
            stageEvents.save(open);
        });
        parent.markCompleted();
        lots.save(parent);

        var childLots = new java.util.ArrayList<LotEntity>();
        for (SplitChild s : splits) {
            var child = new LotEntity(UUID.randomUUID(), tenantId, parent.getCustomerId());
            if (parent.getPoolId() != null) child.linkToPool(parent.getPoolId());
            child.setCurrentStageId(parent.getCurrentStageId());
            if (parent.getPricingArrangementId() != null
                && parent.getPricingKindSnapshot() != null
                && parent.getPricingConfigSnapshot() != null) {
                child.snapshotPricing(
                    parent.getPricingArrangementId(),
                    parent.getPricingKindSnapshot(),
                    parent.getPricingConfigSnapshot());
            }
            child.setIntakeWeight(s.weightKg());
            lots.save(child);

            lineage.save(new co.pindraft.mill_ops.domain.LotLineageEntity(
                UUID.randomUUID(), parentLotId, child.getId(),
                co.pindraft.mill_ops.domain.LotLineageTransition.SPLIT));

            var childEvent = new LotStageEventEntity(
                UUID.randomUUID(), child.getId(), parent.getCurrentStageId(),
                s.weightKg(), operatorId);
            stageEvents.save(childEvent);

            childLots.add(child);
        }
        return childLots;
    }

    public record FleeceInput(
        BigDecimal weightKg,
        @Nullable String sourceAnimalName,
        @Nullable String breedCode,
        @Nullable String notes
    ) {}

    public record SplitChild(BigDecimal weightKg, @Nullable String notes) {}
}
