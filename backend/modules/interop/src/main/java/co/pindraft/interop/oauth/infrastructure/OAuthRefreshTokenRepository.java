package co.pindraft.interop.oauth.infrastructure;

import co.pindraft.interop.oauth.domain.OAuthRefreshTokenEntity;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface OAuthRefreshTokenRepository extends JpaRepository<OAuthRefreshTokenEntity, UUID> {
    Optional<OAuthRefreshTokenEntity> findByTokenHash(String tokenHash);

    /** Children of this refresh — the tokens that were rotated FROM the given one. */
    List<OAuthRefreshTokenEntity> findByRotatedFrom(UUID rotatedFrom);
}
