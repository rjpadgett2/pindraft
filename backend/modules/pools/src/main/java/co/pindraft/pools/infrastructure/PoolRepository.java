package co.pindraft.pools.infrastructure;

import co.pindraft.pools.domain.PoolEntity;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PoolRepository extends JpaRepository<PoolEntity, UUID> {
    List<PoolEntity> findByTenantIdOrderByCreatedAtDesc(UUID tenantId);
}
