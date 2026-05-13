package co.pindraft.identity.infrastructure;

import co.pindraft.identity.domain.TenantEntity;
import co.pindraft.identity.domain.TenantKind;
import co.pindraft.identity.domain.TenantStatus;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface TenantRepository extends JpaRepository<TenantEntity, UUID> {

    /** Public mill directory query: LIVE mills only. */
    List<TenantEntity> findByStatusAndKindOrderByName(TenantStatus status, TenantKind kind);
}
