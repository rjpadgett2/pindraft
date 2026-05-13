package co.pindraft.mill_ops.infrastructure;

import co.pindraft.mill_ops.domain.ReservationEntity;
import co.pindraft.mill_ops.domain.ReservationStatus;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ReservationRepository extends JpaRepository<ReservationEntity, UUID> {
    List<ReservationEntity> findByTenantIdOrderBySlotStart(UUID tenantId);
    List<ReservationEntity> findByTenantIdAndStatusOrderBySlotStart(UUID tenantId, ReservationStatus status);

    /** Idempotency lookup for external manifest ingest. */
    Optional<ReservationEntity> findByTenantIdAndExternalShipmentId(UUID tenantId, String externalShipmentId);
}
