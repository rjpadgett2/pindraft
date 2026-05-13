package co.pindraft.interop.oauth.infrastructure;

import co.pindraft.interop.oauth.domain.RsaKeyEntity;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface RsaKeyRepository extends JpaRepository<RsaKeyEntity, UUID> {
    Optional<RsaKeyEntity> findFirstByActiveForSigningTrueOrderByCreatedAtDesc();
    List<RsaKeyEntity> findAllByOrderByCreatedAtDesc();
}
