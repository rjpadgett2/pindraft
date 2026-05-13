package co.pindraft.mill_ops.api;

import co.pindraft.common.security.TenantAccessGuard;
import co.pindraft.common.security.TenantContextHolder;
import co.pindraft.mill_ops.application.LotService;
import co.pindraft.mill_ops.application.LotService.FleeceInput;
import co.pindraft.mill_ops.domain.*;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/tenants/{tenantId}/lots")
@Tag(name = "Operations", description = "Lots and stage transitions")
public class LotController {

    private final LotService service;
    private final TenantAccessGuard accessGuard;
    private final TenantContextHolder contextHolder;

    public LotController(LotService service, TenantAccessGuard accessGuard, TenantContextHolder contextHolder) {
        this.service = service;
        this.accessGuard = accessGuard;
        this.contextHolder = contextHolder;
    }

    @GetMapping
    @Operation(summary = "List lots for a tenant")
    public List<LotResponse> list(@PathVariable UUID tenantId) {
        accessGuard.requireStaffAccess(tenantId);
        return service.listForTenant(tenantId).stream().map(LotController::toResponse).toList();
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get a lot's detail including fleeces and history")
    public LotDetailResponse getOne(@PathVariable UUID tenantId, @PathVariable UUID id) {
        accessGuard.requireStaffAccess(tenantId);
        var lot = service.getOne(tenantId, id);
        var fleeces = service.fleecesForLot(id).stream().map(LotController::toFleeceResponse).toList();
        var history = service.historyForLot(id).stream().map(LotController::toHistoryResponse).toList();
        return new LotDetailResponse(toResponse(lot), fleeces, history);
    }

    @PostMapping("/intake")
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Intake transaction: convert a reservation into a lot with fleeces, optionally linked to a pool")
    public LotResponse intake(@PathVariable UUID tenantId, @Valid @RequestBody IntakeRequest req) {
        accessGuard.requireStaffAccess(tenantId);
        var operatorId = contextHolder.get().userId();
        var fleeceInputs = req.fleeces().stream()
            .map(f -> new FleeceInput(f.weightKg(), f.sourceAnimalName(), f.breedCode(), f.notes()))
            .toList();
        var lot = service.intake(tenantId, req.reservationId(), fleeceInputs, req.poolId(), operatorId);
        return toResponse(lot);
    }

    @PostMapping("/walk-in-intake")
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Walk-in intake: fiber arriving without a prior reservation. Operator picks the customer and pricing arrangement directly.")
    public LotResponse walkInIntake(@PathVariable UUID tenantId, @Valid @RequestBody WalkInIntakeRequest req) {
        accessGuard.requireStaffAccess(tenantId);
        var operatorId = contextHolder.get().userId();
        var fleeceInputs = req.fleeces().stream()
            .map(f -> new FleeceInput(f.weightKg(), f.sourceAnimalName(), f.breedCode(), f.notes()))
            .toList();
        var lot = service.walkInIntake(
            tenantId, req.customerId(), fleeceInputs,
            req.pricingArrangementId(), req.poolId(), operatorId);
        return toResponse(lot);
    }

    @PostMapping("/intake-from-pool")
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Wool-pool batching: combine all contributions of a pool into a single new pooled lot. MERGE lineage written for contributions that carry a source lot.")
    public LotResponse intakeFromPool(@PathVariable UUID tenantId, @Valid @RequestBody PoolIntakeRequest req) {
        accessGuard.requireStaffAccess(tenantId);
        var operatorId = contextHolder.get().userId();
        var lot = service.intakeFromPool(tenantId, req.poolId(), operatorId);
        return toResponse(lot);
    }

    @PostMapping("/{id}/transition")
    @Operation(summary = "Stage transition: advance a lot to the next workflow stage")
    public LotResponse transition(
        @PathVariable UUID tenantId, @PathVariable UUID id,
        @Valid @RequestBody TransitionRequest req
    ) {
        accessGuard.requireStaffAccess(tenantId);
        var operatorId = contextHolder.get().userId();
        var lot = service.transitionToNextStage(
            tenantId, id, req.targetStageId(), req.weightOutKg(),
            req.equipmentId(), req.notes(), operatorId);
        return toResponse(lot);
    }

    @PostMapping("/{id}/complete")
    @Operation(summary = "Mark a lot complete. Closes the open stage event with final weight and triggers invoice generation via LotCompletedEvent.")
    public LotResponse complete(
        @PathVariable UUID tenantId, @PathVariable UUID id,
        @Valid @RequestBody(required = false) CompleteRequest req
    ) {
        accessGuard.requireStaffAccess(tenantId);
        var operatorId = contextHolder.get().userId();
        var finalWeight = req == null ? null : req.finalWeightKg();
        var lot = service.completeLot(tenantId, id, finalWeight, operatorId);
        return toResponse(lot);
    }

    @PostMapping("/{id}/split")
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Split a lot into N child lots. Parent is closed and marked COMPLETED; children inherit pricing snapshot and current stage; lineage rows written.")
    public List<LotResponse> split(
        @PathVariable UUID tenantId, @PathVariable UUID id,
        @Valid @RequestBody SplitRequest req
    ) {
        accessGuard.requireStaffAccess(tenantId);
        var operatorId = contextHolder.get().userId();
        var splits = req.children().stream()
            .map(c -> new co.pindraft.mill_ops.application.LotService.SplitChild(c.weightKg(), c.notes()))
            .toList();
        return service.splitLot(tenantId, id, splits, operatorId).stream()
            .map(LotController::toResponse).toList();
    }

    private static LotResponse toResponse(LotEntity lot) {
        return new LotResponse(
            lot.getId(), lot.getCustomerId(), lot.getReservationId(), lot.getPoolId(),
            lot.getCurrentStageId(), lot.getWeightIntakeKg(),
            lot.getPricingKindSnapshot(), lot.getPricingConfigSnapshot(),
            lot.getStatus(), lot.getCreatedAt());
    }

    private static FleeceResponse toFleeceResponse(IntakeFleeceEntity f) {
        return new FleeceResponse(f.getId(), f.getWeightKg(), f.getSourceAnimalName(), f.getBreedCode(), f.getNotes());
    }

    private static HistoryEventResponse toHistoryResponse(LotStageEventEntity e) {
        return new HistoryEventResponse(
            e.getId(), e.getWorkflowStageId(), e.getEnteredAt(), e.getExitedAt(),
            e.getWeightInKg(), e.getWeightOutKg(), e.getActorUserId());
    }

    public record LotResponse(
        UUID id, UUID customerId, UUID reservationId, UUID poolId, UUID currentStageId,
        BigDecimal weightIntakeKg,
        String pricingKindSnapshot, String pricingConfigSnapshot,
        LotStatus status, Instant createdAt) {}
    public record LotDetailResponse(LotResponse lot, List<FleeceResponse> fleeces, List<HistoryEventResponse> history) {}
    public record FleeceResponse(UUID id, BigDecimal weightKg, String sourceAnimalName, String breedCode, String notes) {}
    public record HistoryEventResponse(
        UUID id, UUID workflowStageId, Instant enteredAt, Instant exitedAt,
        BigDecimal weightInKg, BigDecimal weightOutKg, UUID actorUserId) {}
    public record IntakeRequest(
        @NotNull UUID reservationId,
        UUID poolId,
        @NotEmpty List<FleeceRequest> fleeces) {}
    public record WalkInIntakeRequest(
        @NotNull UUID customerId,
        UUID pricingArrangementId,
        UUID poolId,
        @NotEmpty List<FleeceRequest> fleeces) {}
    public record FleeceRequest(
        @NotNull @Positive BigDecimal weightKg,
        String sourceAnimalName, String breedCode, String notes) {}
    public record TransitionRequest(
        UUID targetStageId,
        @NotNull @Positive BigDecimal weightOutKg,
        UUID equipmentId,
        String notes) {}
    public record CompleteRequest(@Positive BigDecimal finalWeightKg) {}
    public record SplitRequest(@NotEmpty List<SplitChildRequest> children) {}
    public record SplitChildRequest(@NotNull @Positive BigDecimal weightKg, String notes) {}
    public record PoolIntakeRequest(@NotNull UUID poolId) {}
}
