package co.pindraft.mill_ops.api;

import co.pindraft.common.security.TenantContextHolder;
import co.pindraft.mill_ops.application.CustomerLotService;
import co.pindraft.mill_ops.domain.IntakeFleeceEntity;
import co.pindraft.mill_ops.domain.LotEntity;
import co.pindraft.mill_ops.domain.LotStageEventEntity;
import co.pindraft.mill_ops.domain.LotStatus;
import co.pindraft.mill_ops.domain.WorkflowStageEntity;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.jspecify.annotations.Nullable;
import org.springframework.web.bind.annotation.*;

/**
 * Customer-side endpoints. Cross-tenant by design; scoped by the current user's
 * customer relationships.
 *
 * <p>Lot detail response includes workflow stage type and display name on each history
 * event — resolved server-side so the customer-portal frontend doesn't need a second
 * round-trip to render names instead of UUIDs.
 */
@RestController
@RequestMapping("/api/v1/me/lots")
@Tag(name = "Customer", description = "Customer-side views")
public class MeLotController {

    private final CustomerLotService service;
    private final co.pindraft.mill_ops.application.FiberTestService fiberTests;
    private final TenantContextHolder contextHolder;

    public MeLotController(
        CustomerLotService service,
        co.pindraft.mill_ops.application.FiberTestService fiberTests,
        TenantContextHolder contextHolder
    ) {
        this.service = service;
        this.fiberTests = fiberTests;
        this.contextHolder = contextHolder;
    }

    @GetMapping
    @Operation(summary = "List all my lots across all mills I transact with")
    public List<CustomerLotResponse> list() {
        var userId = contextHolder.get().userId();
        if (userId == null) throw new IllegalStateException("No authenticated user");
        return service.listForUser(userId).stream()
            .map(MeLotController::toCustomerResponse).toList();
    }

    @GetMapping("/{lotId}/status")
    @Operation(summary = "Customer-visible status projection — \"Scoured. Drying. In spinning queue, position 7.\"")
    public CustomerLotService.LotStatusProjection status(@PathVariable UUID lotId) {
        var userId = contextHolder.get().userId();
        if (userId == null) throw new IllegalStateException("No authenticated user");
        return service.statusProjectionForUser(userId, lotId);
    }

    @GetMapping("/{lotId}/fiber-tests")
    @Operation(summary = "Read-only fiber test results attached to one of my lots — feeds shepherd lifetime micron view")
    public List<MeFiberTest> fiberTests(@PathVariable UUID lotId) {
        var userId = contextHolder.get().userId();
        if (userId == null) throw new IllegalStateException("No authenticated user");
        // Authorization piggy-backs on getForUser — throws LotNotFound if it isn't mine.
        service.getForUser(userId, lotId);
        return fiberTests.listForLotIds(java.util.List.of(lotId)).stream()
            .map(t -> new MeFiberTest(
                t.getId(), t.getLotId(), t.getTestType().name(),
                t.getInstrument(), t.getResultNumeric(), t.getResultUnit(),
                t.getTestedAt()))
            .toList();
    }

    public record MeFiberTest(
        UUID id, UUID lotId, String testType,
        String instrument, java.math.BigDecimal resultNumeric, String resultUnit,
        Instant testedAt) {}

    @GetMapping("/{lotId}")
    @Operation(summary = "Get one of my lots with fleeces and stage history (names resolved)")
    public CustomerLotDetailResponse getOne(@PathVariable UUID lotId) {
        var userId = contextHolder.get().userId();
        if (userId == null) throw new IllegalStateException("No authenticated user");

        var lot = service.getForUser(userId, lotId);
        var stagesById = service.stagesByIdForTenant(lot.getTenantId());

        var fleeces = service.fleecesForLot(lotId).stream()
            .map(MeLotController::toFleece).toList();
        var history = service.historyForLot(lotId).stream()
            .map(e -> toHistory(e, stagesById)).toList();

        var currentStageType = stagesById.containsKey(lot.getCurrentStageId())
            ? stagesById.get(lot.getCurrentStageId()).getStageType() : null;
        var currentStageDisplayName = stagesById.containsKey(lot.getCurrentStageId())
            ? stagesById.get(lot.getCurrentStageId()).getDisplayName() : null;
        var lotResponse = toCustomerResponseWithStage(lot, currentStageType, currentStageDisplayName);

        return new CustomerLotDetailResponse(lotResponse, fleeces, history);
    }

    private static CustomerLotResponse toCustomerResponse(LotEntity lot) {
        return toCustomerResponseWithStage(lot, null, null);
    }

    private static CustomerLotResponse toCustomerResponseWithStage(
        LotEntity lot, @Nullable String stageType, @Nullable String stageDisplayName
    ) {
        return new CustomerLotResponse(
            lot.getId(), lot.getTenantId(), lot.getCustomerId(),
            lot.getCurrentStageId(), stageType, stageDisplayName,
            lot.getWeightIntakeKg(), lot.getStatus(), lot.getCreatedAt());
    }

    private static FleeceResponse toFleece(IntakeFleeceEntity f) {
        return new FleeceResponse(f.getId(), f.getWeightKg(), f.getSourceAnimalName(), f.getBreedCode());
    }

    private static HistoryEventResponse toHistory(LotStageEventEntity e, Map<UUID, WorkflowStageEntity> stagesById) {
        var stage = stagesById.get(e.getWorkflowStageId());
        return new HistoryEventResponse(
            e.getId(), e.getWorkflowStageId(),
            stage != null ? stage.getStageType() : null,
            stage != null ? stage.getDisplayName() : null,
            e.getEnteredAt(), e.getExitedAt(),
            e.getWeightInKg(), e.getWeightOutKg());
    }

    public record CustomerLotResponse(
        UUID id, UUID tenantId, UUID customerId,
        UUID currentStageId, String currentStageType, String currentStageDisplayName,
        BigDecimal weightIntakeKg,
        LotStatus status, Instant createdAt) {}

    public record CustomerLotDetailResponse(
        CustomerLotResponse lot, List<FleeceResponse> fleeces, List<HistoryEventResponse> history) {}

    public record FleeceResponse(
        UUID id, BigDecimal weightKg, String sourceAnimalName, String breedCode) {}

    public record HistoryEventResponse(
        UUID id, UUID workflowStageId,
        String stageType, String stageDisplayName,
        Instant enteredAt, Instant exitedAt,
        BigDecimal weightInKg, BigDecimal weightOutKg) {}
}
