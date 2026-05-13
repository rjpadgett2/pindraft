package co.pindraft.mill_ops.application;

import co.pindraft.common.error.PindraftException;
import co.pindraft.identity.domain.TenantStatus;
import co.pindraft.identity.infrastructure.TenantRepository;
import co.pindraft.mill_ops.api.SetupStatusController.SetupStatusResponse;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class GoLiveService {

    private final TenantRepository tenants;
    private final SetupStatusService setupStatus;

    public GoLiveService(TenantRepository tenants, SetupStatusService setupStatus) {
        this.tenants = tenants;
        this.setupStatus = setupStatus;
    }

    @Transactional
    public SetupStatusResponse goLive(UUID tenantId) {
        var status = setupStatus.statusFor(tenantId);
        if (!status.readyToGoLive()) {
            throw new NotReadyToGoLiveException();
        }
        var tenant = tenants.findById(tenantId).orElseThrow();
        tenant.transitionTo(TenantStatus.LIVE);
        tenants.save(tenant);
        return setupStatus.statusFor(tenantId);
    }

    static class NotReadyToGoLiveException extends PindraftException {
        NotReadyToGoLiveException() {
            super("not_ready_to_go_live", "Required setup steps are incomplete", 400);
        }
    }
}
