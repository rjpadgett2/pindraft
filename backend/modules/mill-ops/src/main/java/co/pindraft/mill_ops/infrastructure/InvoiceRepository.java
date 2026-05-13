package co.pindraft.mill_ops.infrastructure;

import co.pindraft.mill_ops.domain.InvoiceEntity;
import co.pindraft.mill_ops.domain.InvoiceStatus;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface InvoiceRepository extends JpaRepository<InvoiceEntity, UUID> {
    List<InvoiceEntity> findByTenantIdOrderByCreatedAtDesc(UUID tenantId);
    List<InvoiceEntity> findByTenantIdAndCustomerIdOrderByCreatedAtDesc(UUID tenantId, UUID customerId);
    List<InvoiceEntity> findByTenantIdAndStatusOrderByCreatedAtDesc(UUID tenantId, InvoiceStatus status);
    Optional<InvoiceEntity> findByLotId(UUID lotId);
    long countByTenantId(UUID tenantId);
}
