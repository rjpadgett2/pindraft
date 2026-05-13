package co.pindraft.identity.infrastructure;

import co.pindraft.identity.domain.TenantMembershipEntity;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface TenantMembershipRepository extends JpaRepository<TenantMembershipEntity, UUID> {
    List<TenantMembershipEntity> findByUserId(UUID userId);
    java.util.Optional<TenantMembershipEntity> findByUserIdAndTenantId(UUID userId, UUID tenantId);
}
