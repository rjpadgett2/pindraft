package co.pindraft.mill_ops.application;

import co.pindraft.identity.domain.TenantCustomerEntity;
import co.pindraft.identity.infrastructure.TenantCustomerRepository;
import co.pindraft.mill_ops.domain.IntakeFleeceEntity;
import co.pindraft.mill_ops.domain.LotEntity;
import co.pindraft.mill_ops.domain.LotStageEventEntity;
import co.pindraft.mill_ops.domain.WorkflowStageEntity;
import co.pindraft.mill_ops.infrastructure.IntakeFleeceRepository;
import co.pindraft.mill_ops.infrastructure.LotRepository;
import co.pindraft.mill_ops.infrastructure.LotStageEventRepository;
import co.pindraft.mill_ops.infrastructure.WorkflowStageRepository;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;
import org.jspecify.annotations.NullMarked;
import org.jspecify.annotations.Nullable;
import org.springframework.stereotype.Service;

/**
 * Customer-side lot queries. Cross-tenant by design — a shepherd's customer record
 * exists at every mill they transact with, and this service joins those relationships
 * to surface their lots across mills as one stream.
 *
 * <p>For lot detail, this service also resolves workflow stage names server-side so the
 * customer-portal frontend doesn't need a separate query — each {@code lot_stage_event}
 * in the response carries the stage type and display name directly.
 */
@Service
@NullMarked
public class CustomerLotService {

    private final LotRepository lots;
    private final TenantCustomerRepository customers;
    private final IntakeFleeceRepository intakeFleeces;
    private final LotStageEventRepository stageEvents;
    private final WorkflowStageRepository workflowStages;

    public CustomerLotService(
        LotRepository lots,
        TenantCustomerRepository customers,
        IntakeFleeceRepository intakeFleeces,
        LotStageEventRepository stageEvents,
        WorkflowStageRepository workflowStages
    ) {
        this.lots = lots;
        this.customers = customers;
        this.intakeFleeces = intakeFleeces;
        this.stageEvents = stageEvents;
        this.workflowStages = workflowStages;
    }

    public List<LotEntity> listForUser(UUID userId) {
        var customerIds = customers.findByUserId(userId).stream()
            .map(TenantCustomerEntity::getId).toList();
        if (customerIds.isEmpty()) return List.of();
        return lots.findByCustomerIdInOrderByCreatedAtDesc(customerIds);
    }

    public LotEntity getForUser(UUID userId, UUID lotId) {
        var lot = lots.findById(lotId).orElseThrow(() -> new LotNotFoundException(lotId));
        var myCustomerIds = customers.findByUserId(userId).stream()
            .map(TenantCustomerEntity::getId).toList();
        if (!myCustomerIds.contains(lot.getCustomerId())) {
            throw new LotNotFoundException(lotId);
        }
        return lot;
    }

    public List<IntakeFleeceEntity> fleecesForLot(UUID lotId) {
        return intakeFleeces.findByLotId(lotId);
    }

    public List<LotStageEventEntity> historyForLot(UUID lotId) {
        return stageEvents.findByLotIdOrderByEnteredAt(lotId);
    }

    /**
     * Resolve workflow stage IDs to a map of {@code id → (stageType, displayName)} for a
     * tenant. The customer-side endpoint uses this to render real names rather than UUIDs.
     */
    public Map<UUID, WorkflowStageEntity> stagesByIdForTenant(UUID tenantId) {
        return workflowStages.findByTenantIdOrderByOrderIndex(tenantId).stream()
            .collect(Collectors.toMap(WorkflowStageEntity::getId, s -> s));
    }

    /**
     * Customer-visible status projection — the spec's "Scoured. Drying. In spinning
     * queue, position 7" projection. Composed from {@code lot_stage_events} history plus
     * a queue-position calculation: among all lots currently open at the same stage, how
     * many entered before me (1-indexed)?
     *
     * <p>The spec calls this out as a projection over events, not a denormalized column.
     * Source of truth stays in {@code lot_stage_events}; this method computes presentation.
     */
    public LotStatusProjection statusProjectionForUser(UUID userId, UUID lotId) {
        var lot = getForUser(userId, lotId);
        var stagesById = stagesByIdForTenant(lot.getTenantId());
        var history = stageEvents.findByLotIdOrderByEnteredAt(lotId);

        var completed = new java.util.ArrayList<CompletedStageProjection>();
        LotStageEventEntity openEvent = null;
        for (var e : history) {
            var stage = stagesById.get(e.getWorkflowStageId());
            if (e.getExitedAt() != null) {
                completed.add(new CompletedStageProjection(
                    e.getWorkflowStageId(),
                    stage != null ? stage.getStageType() : null,
                    stage != null ? stage.getDisplayName() : null,
                    e.getEnteredAt(), e.getExitedAt(), e.getWeightOutKg()));
            } else {
                openEvent = e;
            }
        }

        CurrentStageProjection current = null;
        if (openEvent != null) {
            // Same-tenant only — stage IDs are tenant-scoped already, so findOpenAtStage
            // returns this tenant's open events at the stage.
            var openAtStage = stageEvents.findOpenAtStage(openEvent.getWorkflowStageId());
            final var openEnteredAt = openEvent.getEnteredAt();
            int queuePosition = (int) (openAtStage.stream()
                .filter(o -> o.getEnteredAt().isBefore(openEnteredAt))
                .count() + 1);
            var stage = stagesById.get(openEvent.getWorkflowStageId());
            current = new CurrentStageProjection(
                openEvent.getWorkflowStageId(),
                stage != null ? stage.getStageType() : null,
                stage != null ? stage.getDisplayName() : null,
                openEvent.getEnteredAt(), queuePosition);
        }

        var friendly = renderFriendlyStatus(completed, current, lot.getStatus());
        return new LotStatusProjection(lot.getId(), lot.getStatus(), friendly, completed, current);
    }

    private static String renderFriendlyStatus(
        List<CompletedStageProjection> completed,
        @Nullable CurrentStageProjection current,
        co.pindraft.mill_ops.domain.LotStatus lotStatus
    ) {
        if (lotStatus == co.pindraft.mill_ops.domain.LotStatus.COMPLETED) return "Completed.";
        if (lotStatus == co.pindraft.mill_ops.domain.LotStatus.CANCELLED) return "Cancelled.";

        var parts = new java.util.ArrayList<String>();
        for (var c : completed) {
            if (c.stageDisplayName() != null) parts.add(c.stageDisplayName());
        }
        if (current != null && current.stageDisplayName() != null) {
            if (current.queuePosition() > 1) {
                parts.add("In " + current.stageDisplayName().toLowerCase()
                    + " queue, position " + current.queuePosition());
            } else {
                parts.add(current.stageDisplayName());
            }
        }
        if (parts.isEmpty()) return "Waiting for intake.";
        return String.join(". ", parts) + ".";
    }

    public record LotStatusProjection(
        UUID lotId,
        co.pindraft.mill_ops.domain.LotStatus lotStatus,
        String customerVisibleStatus,
        List<CompletedStageProjection> completedStages,
        @Nullable CurrentStageProjection currentStage
    ) {}

    public record CompletedStageProjection(
        UUID workflowStageId,
        @Nullable String stageType,
        @Nullable String stageDisplayName,
        Instant enteredAt,
        Instant exitedAt,
        @Nullable BigDecimal weightOutKg
    ) {}

    public record CurrentStageProjection(
        UUID workflowStageId,
        @Nullable String stageType,
        @Nullable String stageDisplayName,
        Instant enteredAt,
        int queuePosition
    ) {}
}
