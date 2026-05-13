package co.pindraft.interop.oauth.infrastructure;

import co.pindraft.interop.oauth.domain.AuthorizationCodeEntity;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AuthorizationCodeRepository extends JpaRepository<AuthorizationCodeEntity, UUID> {
    Optional<AuthorizationCodeEntity> findByCode(String code);
}
