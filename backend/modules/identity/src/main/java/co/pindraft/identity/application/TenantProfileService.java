package co.pindraft.identity.application;

import co.pindraft.identity.domain.TenantEntity;
import co.pindraft.identity.infrastructure.TenantRepository;
import java.util.UUID;
import org.jspecify.annotations.Nullable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class TenantProfileService {

    private final TenantRepository tenants;

    public TenantProfileService(TenantRepository tenants) {
        this.tenants = tenants;
    }

    public TenantEntity getProfile(UUID tenantId) {
        return tenants.findById(tenantId).orElseThrow();
    }

    @Transactional
    public TenantEntity updateProfile(
        UUID tenantId, @Nullable String name,
        @Nullable String defaultUnit, @Nullable String timeZone
    ) {
        var tenant = tenants.findById(tenantId).orElseThrow();
        tenant.updateProfile(name, defaultUnit, timeZone);
        return tenants.save(tenant);
    }
}
