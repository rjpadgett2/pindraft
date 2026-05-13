package co.pindraft.identity.infrastructure;

import co.pindraft.identity.domain.InvitationStatus;
import co.pindraft.identity.domain.TenantInvitationEntity;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface TenantInvitationRepository extends JpaRepository<TenantInvitationEntity, UUID> {
    Optional<TenantInvitationEntity> findByTokenHash(String tokenHash);
    List<TenantInvitationEntity> findByTenantIdOrderByCreatedAtDesc(UUID tenantId);
    List<TenantInvitationEntity> findByTenantIdAndStatusOrderByCreatedAtDesc(UUID tenantId, InvitationStatus status);
}
