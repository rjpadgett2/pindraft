package co.pindraft.interop.oauth.infrastructure;

import co.pindraft.interop.oauth.domain.OAuthClientEntity;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface OAuthClientRepository extends JpaRepository<OAuthClientEntity, UUID> {
    Optional<OAuthClientEntity> findByIdAndActiveTrue(UUID id);
}
