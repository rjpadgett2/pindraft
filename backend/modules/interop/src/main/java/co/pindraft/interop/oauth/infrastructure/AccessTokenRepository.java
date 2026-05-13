package co.pindraft.interop.oauth.infrastructure;

import co.pindraft.interop.oauth.domain.AccessTokenEntity;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AccessTokenRepository extends JpaRepository<AccessTokenEntity, UUID> {

    Optional<AccessTokenEntity> findByTokenHash(String tokenHash);

    /**
     * Active (unrevoked) access tokens for one (client, user, tenant) tuple. Used by
     * chain revocation when a refresh token is detected being reused.
     */
    List<AccessTokenEntity> findByClientIdAndUserIdAndTenantIdAndRevokedAtIsNull(
        UUID clientId, UUID userId, UUID tenantId);
}
