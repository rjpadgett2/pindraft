package co.pindraft.mill_ops.api;

import co.pindraft.common.security.TenantAccessGuard;
import co.pindraft.mill_ops.application.EquipmentRunService;
import co.pindraft.mill_ops.domain.EquipmentRunEntity;
import co.pindraft.mill_ops.domain.EquipmentRunLotEntity;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/tenants/{tenantId}/equipment-runs")
@Tag(name = "Operations", description = "Equipment runs (floor batching)")
public class EquipmentRunController {

    private final EquipmentRunService service;
    private final TenantAccessGuard accessGuard;

    public EquipmentRunController(EquipmentRunService service, TenantAccessGuard accessGuard) {
        this.service = service;
        this.accessGuard = accessGuard;
    }

    @GetMapping
    @Operation(summary = "List open equipment runs for a tenant")
    public List<EquipmentRunResponse> listOpen(@PathVariable UUID tenantId) {
        accessGuard.requireStaffAccess(tenantId);
        return service.listOpenForTenant(tenantId).stream().map(EquipmentRunController::toResponse).toList();
    }

    @GetMapping("/{runId}/lots")
    @Operation(summary = "List lots attached to an equipment run")
    public List<EquipmentRunLotResponse> lotsInRun(@PathVariable UUID tenantId, @PathVariable UUID runId) {
        accessGuard.requireStaffAccess(tenantId);
        return service.lotsInRun(runId).stream().map(EquipmentRunController::toLotResponse).toList();
    }

    @PostMapping("/{runId}/close")
    @Operation(summary = "Close an open equipment run")
    public EquipmentRunResponse close(@PathVariable UUID tenantId, @PathVariable UUID runId) {
        accessGuard.requireStaffAccess(tenantId);
        return toResponse(service.closeRun(tenantId, runId));
    }

    private static EquipmentRunResponse toResponse(EquipmentRunEntity r) {
        return new EquipmentRunResponse(
            r.getId(), r.getEquipmentId(), r.getStartedAt(), r.getFinishedAt(), r.getOperatorId());
    }

    private static EquipmentRunLotResponse toLotResponse(EquipmentRunLotEntity l) {
        return new EquipmentRunLotResponse(
            l.getId(), l.getEquipmentRunId(), l.getLotId(), l.getWeightInKg(), l.getWeightOutKg());
    }

    public record EquipmentRunResponse(
        UUID id, UUID equipmentId, Instant startedAt, Instant finishedAt, UUID operatorId) {}
    public record EquipmentRunLotResponse(
        UUID id, UUID equipmentRunId, UUID lotId, BigDecimal weightInKg, BigDecimal weightOutKg) {}
}
