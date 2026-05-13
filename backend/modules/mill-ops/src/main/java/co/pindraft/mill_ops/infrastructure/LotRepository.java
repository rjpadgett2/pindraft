package co.pindraft.mill_ops.infrastructure;

import co.pindraft.mill_ops.domain.LotEntity;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface LotRepository extends JpaRepository<LotEntity, UUID> {
    List<LotEntity> findByTenantIdOrderByCreatedAtDesc(UUID tenantId);

    /** Cross-tenant query — used by the customer portal to show lots across mills. */
    List<LotEntity> findByCustomerIdInOrderByCreatedAtDesc(List<UUID> customerIds);

    /** Lots linked to a pool — surfaces per-lot revenue back to pool distribution math. */
    List<LotEntity> findByPoolIdOrderByCreatedAtDesc(UUID poolId);
}
