package co.pindraft.mill_ops.api;

import co.pindraft.common.security.TenantAccessGuard;
import co.pindraft.mill_ops.application.EquipmentService;
import co.pindraft.mill_ops.domain.EquipmentEntity;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/tenants/{tenantId}/equipment")
@Tag(name = "Onboarding", description = "Tenant setup hub")
public class EquipmentController {

    private final EquipmentService service;
    private final TenantAccessGuard accessGuard;

    public EquipmentController(EquipmentService service, TenantAccessGuard accessGuard) {
        this.service = service;
        this.accessGuard = accessGuard;
    }

    @GetMapping
    @Operation(summary = "List equipment for a tenant")
    public List<EquipmentResponse> list(@PathVariable UUID tenantId) {
        accessGuard.requireAnyAccess(tenantId);
        return service.listForTenant(tenantId).stream().map(EquipmentController::toResponse).toList();
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Add equipment")
    public EquipmentResponse create(@PathVariable UUID tenantId, @Valid @RequestBody CreateRequest req) {
        accessGuard.requireRole(tenantId, "MILL_ADMIN");
        var e = service.create(
            tenantId, req.equipmentType(), req.name(),
            req.workflowStageId(), req.maxWeightKg(), req.typicalRunMinutes());
        return toResponse(e);
    }

    @DeleteMapping("/{equipmentId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Operation(summary = "Deactivate equipment (soft delete — preserves history)")
    public void deactivate(@PathVariable UUID tenantId, @PathVariable UUID equipmentId) {
        accessGuard.requireRole(tenantId, "MILL_ADMIN");
        service.deactivate(tenantId, equipmentId);
    }

    private static EquipmentResponse toResponse(EquipmentEntity e) {
        return new EquipmentResponse(
            e.getId(), e.getEquipmentType(), e.getName(),
            e.getWorkflowStageId(), e.getMaxWeightKg(), e.getTypicalRunMinutes());
    }

    public record EquipmentResponse(
        UUID id, String equipmentType, String name,
        UUID workflowStageId, BigDecimal maxWeightKg, Integer typicalRunMinutes) {}

    public record CreateRequest(
        @NotBlank String equipmentType,
        @NotBlank String name,
        UUID workflowStageId,
        BigDecimal maxWeightKg,
        Integer typicalRunMinutes
    ) {}
}
