package co.pindraft.mill_ops.api;

import co.pindraft.common.security.TenantAccessGuard;
import co.pindraft.mill_ops.application.GoLiveService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.UUID;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/tenants/{tenantId}/go-live")
@Tag(name = "Onboarding", description = "Tenant setup hub")
public class GoLiveController {

    private final GoLiveService goLive;
    private final TenantAccessGuard accessGuard;

    public GoLiveController(GoLiveService goLive, TenantAccessGuard accessGuard) {
        this.goLive = goLive;
        this.accessGuard = accessGuard;
    }

    @PostMapping
    @Operation(summary = "Transition tenant from SETUP to LIVE. Requires all required setup complete.")
    public SetupStatusController.SetupStatusResponse goLive(@PathVariable UUID tenantId) {
        accessGuard.requireRole(tenantId, "MILL_ADMIN");
        return goLive.goLive(tenantId);
    }
}
