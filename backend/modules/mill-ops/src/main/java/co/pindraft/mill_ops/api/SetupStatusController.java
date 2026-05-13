package co.pindraft.mill_ops.api;

import co.pindraft.common.security.TenantAccessGuard;
import co.pindraft.mill_ops.application.SetupStatusService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.List;
import java.util.UUID;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Onboarding hub backing endpoint. Returns each setup category's completion status.
 */
@RestController
@RequestMapping("/api/v1/tenants/{tenantId}/setup-status")
@Tag(name = "Onboarding", description = "Tenant setup hub")
public class SetupStatusController {

    private final SetupStatusService setupStatus;
    private final TenantAccessGuard accessGuard;

    public SetupStatusController(SetupStatusService setupStatus, TenantAccessGuard accessGuard) {
        this.setupStatus = setupStatus;
        this.accessGuard = accessGuard;
    }

    @GetMapping
    @Operation(summary = "Get the onboarding hub status for a tenant")
    public SetupStatusResponse get(@PathVariable UUID tenantId) {
        accessGuard.requireRole(tenantId, "MILL_ADMIN");
        return setupStatus.statusFor(tenantId);
    }

    public record SetupStatusResponse(
        UUID tenantId,
        String tenantStatus,           // SETUP, LIVE, PAUSED
        List<SetupCategory> required,
        List<SetupCategory> optional,
        boolean readyToGoLive
    ) {}

    public record SetupCategory(
        String key,
        String label,
        String status,                 // DONE, PARTIAL, NOT_STARTED
        String summary,
        String whatsMissing
    ) {}
}
