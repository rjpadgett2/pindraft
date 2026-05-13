package co.pindraft.mill_ops.api;

import co.pindraft.common.security.TenantAccessGuard;
import co.pindraft.mill_ops.application.WorkflowStageService;
import co.pindraft.mill_ops.domain.WorkflowStageEntity;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/tenants/{tenantId}/workflow-stages")
@Tag(name = "Onboarding", description = "Tenant setup hub")
public class WorkflowStageController {

    private final WorkflowStageService service;
    private final TenantAccessGuard accessGuard;

    public WorkflowStageController(WorkflowStageService service, TenantAccessGuard accessGuard) {
        this.service = service;
        this.accessGuard = accessGuard;
    }

    @GetMapping
    @Operation(summary = "List workflow stages for a tenant")
    public List<WorkflowStageResponse> list(@PathVariable UUID tenantId) {
        accessGuard.requireAnyAccess(tenantId);
        return service.listForTenant(tenantId).stream().map(WorkflowStageController::toResponse).toList();
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Add a workflow stage")
    public WorkflowStageResponse create(@PathVariable UUID tenantId, @Valid @RequestBody CreateRequest req) {
        accessGuard.requireRole(tenantId, "MILL_ADMIN");
        var stage = service.create(tenantId, req.stageType(), req.displayName(), req.requiresEquipment());
        return toResponse(stage);
    }

    @PatchMapping("/{stageId}")
    @Operation(summary = "Rename a workflow stage (display name only)")
    public WorkflowStageResponse rename(
        @PathVariable UUID tenantId,
        @PathVariable UUID stageId,
        @Valid @RequestBody RenameRequest req
    ) {
        accessGuard.requireRole(tenantId, "MILL_ADMIN");
        return toResponse(service.rename(tenantId, stageId, req.displayName()));
    }

    @DeleteMapping("/{stageId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Operation(summary = "Remove a workflow stage. INTAKE and SHIP cannot be removed.")
    public void delete(@PathVariable UUID tenantId, @PathVariable UUID stageId) {
        accessGuard.requireRole(tenantId, "MILL_ADMIN");
        service.delete(tenantId, stageId);
    }

    @PostMapping("/reorder")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Operation(summary = "Reorder workflow stages. Body is the full list of stage IDs in new order.")
    public void reorder(@PathVariable UUID tenantId, @Valid @RequestBody ReorderRequest req) {
        accessGuard.requireRole(tenantId, "MILL_ADMIN");
        service.reorder(tenantId, req.stageIds());
    }

    private static WorkflowStageResponse toResponse(WorkflowStageEntity s) {
        return new WorkflowStageResponse(
            s.getId(), s.getStageType(), s.getDisplayName(), s.getOrderIndex(),
            s.isRequiresEquipment(), s.isTenantCustom());
    }

    public record WorkflowStageResponse(
        UUID id, String stageType, String displayName, int orderIndex,
        boolean requiresEquipment, boolean tenantCustom) {}

    public record CreateRequest(
        @NotBlank String stageType,
        @NotBlank String displayName,
        boolean requiresEquipment
    ) {}

    public record RenameRequest(@NotBlank String displayName) {}

    public record ReorderRequest(@NotEmpty List<UUID> stageIds) {}
}
