package co.pindraft.identity.api;

import co.pindraft.common.security.TenantAccessGuard;
import co.pindraft.identity.application.TenantProfileService;
import co.pindraft.identity.domain.TenantEntity;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.UUID;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/tenants/{tenantId}/profile")
@Tag(name = "Onboarding", description = "Tenant setup hub")
public class TenantProfileController {

    private final TenantProfileService service;
    private final TenantAccessGuard accessGuard;

    public TenantProfileController(TenantProfileService service, TenantAccessGuard accessGuard) {
        this.service = service;
        this.accessGuard = accessGuard;
    }

    @GetMapping
    @Operation(summary = "Get tenant profile")
    public ProfileResponse get(@PathVariable UUID tenantId) {
        accessGuard.requireStaffAccess(tenantId);
        return toResponse(service.getProfile(tenantId));
    }

    @PatchMapping
    @Operation(summary = "Update tenant profile (name, default unit, time zone)")
    public ProfileResponse update(
        @PathVariable UUID tenantId,
        @RequestBody UpdateRequest req
    ) {
        accessGuard.requireRole(tenantId, "MILL_ADMIN");
        var tenant = service.updateProfile(tenantId, req.name(), req.defaultUnit(), req.timeZone());
        return toResponse(tenant);
    }

    private static ProfileResponse toResponse(TenantEntity t) {
        return new ProfileResponse(
            t.getId(), t.getName(), t.getStatus().name(),
            t.getDefaultUnit(), t.getTimeZone());
    }

    public record ProfileResponse(UUID id, String name, String status, String defaultUnit, String timeZone) {}
    public record UpdateRequest(String name, String defaultUnit, String timeZone) {}
}
