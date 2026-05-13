package co.pindraft.billing.api;

import co.pindraft.billing.application.PricingArrangementService;
import co.pindraft.billing.domain.PricingArrangementEntity;
import co.pindraft.billing.domain.PricingKind;
import co.pindraft.common.security.TenantAccessGuard;
import tools.jackson.databind.JsonNode;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/tenants/{tenantId}/pricing-templates")
@Tag(name = "Onboarding", description = "Tenant setup hub")
public class PricingArrangementController {

    private final PricingArrangementService service;
    private final TenantAccessGuard accessGuard;

    public PricingArrangementController(PricingArrangementService service, TenantAccessGuard accessGuard) {
        this.service = service;
        this.accessGuard = accessGuard;
    }

    @GetMapping
    @Operation(summary = "List pricing templates")
    public List<PricingResponse> list(@PathVariable UUID tenantId) {
        accessGuard.requireAnyAccess(tenantId);
        return service.listForTenant(tenantId).stream().map(PricingArrangementController::toResponse).toList();
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Create a pricing template")
    public PricingResponse create(@PathVariable UUID tenantId, @Valid @RequestBody CreateRequest req) {
        accessGuard.requireRole(tenantId, "MILL_ADMIN");
        return toResponse(service.create(tenantId, req.name(), req.kind(), req.config()));
    }

    @PatchMapping("/{id}")
    @Operation(summary = "Update a pricing template (name and/or config)")
    public PricingResponse update(
        @PathVariable UUID tenantId,
        @PathVariable UUID id,
        @RequestBody UpdateRequest req
    ) {
        accessGuard.requireRole(tenantId, "MILL_ADMIN");
        return toResponse(service.update(tenantId, id, req.name(), req.config()));
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Operation(summary = "Soft-delete a pricing template")
    public void deactivate(@PathVariable UUID tenantId, @PathVariable UUID id) {
        accessGuard.requireRole(tenantId, "MILL_ADMIN");
        service.deactivate(tenantId, id);
    }

    private static PricingResponse toResponse(PricingArrangementEntity e) {
        return new PricingResponse(e.getId(), e.getName(), e.getKind(), e.getConfigJson());
    }

    public record PricingResponse(UUID id, String name, PricingKind kind, String configJson) {}

    public record CreateRequest(
        @NotBlank String name,
        @NotNull PricingKind kind,
        @NotNull JsonNode config
    ) {}

    public record UpdateRequest(String name, JsonNode config) {}
}
