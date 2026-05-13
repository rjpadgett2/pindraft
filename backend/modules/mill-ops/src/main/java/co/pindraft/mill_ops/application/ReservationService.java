package co.pindraft.mill_ops.application;

import co.pindraft.mill_ops.ReservationCreator;
import co.pindraft.mill_ops.domain.ReservationEntity;
import co.pindraft.mill_ops.domain.ReservationStatus;
import co.pindraft.mill_ops.infrastructure.ReservationRepository;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.jspecify.annotations.Nullable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ReservationService implements ReservationCreator {

    private final ReservationRepository repo;

    public ReservationService(ReservationRepository repo) {
        this.repo = repo;
    }

    public List<ReservationEntity> listForTenant(UUID tenantId, @Nullable ReservationStatus status) {
        if (status == null) return repo.findByTenantIdOrderBySlotStart(tenantId);
        return repo.findByTenantIdAndStatusOrderBySlotStart(tenantId, status);
    }

    public ReservationEntity getOne(UUID tenantId, UUID id) {
        var r = repo.findById(id).orElseThrow(() -> new ReservationNotFoundException(id));
        if (!r.getTenantId().equals(tenantId)) throw new ReservationNotFoundException(id);
        return r;
    }

    @Transactional
    public ReservationEntity create(UUID tenantId, UUID customerId, @Nullable UUID pricingArrangementId,
                                    BigDecimal expectedWeightKg, Instant slotStart) {
        var r = new ReservationEntity(
            UUID.randomUUID(), tenantId, customerId, pricingArrangementId, expectedWeightKg, slotStart);
        return repo.save(r);
    }

    @Transactional
    public void cancel(UUID tenantId, UUID id) {
        var r = getOne(tenantId, id);
        if (r.getStatus() != ReservationStatus.PENDING) {
            throw new InvalidReservationStateException(r.getStatus(), "cancel");
        }
        r.cancel();
        repo.save(r);
    }

    // ---- ReservationCreator implementation (cross-module entry point) ----

    @Override
    @Transactional
    public Reservation createFromExternalShipment(ExternalShipmentInput input) {
        // Idempotent on (tenantId, externalShipmentId): return existing if found
        var existing = repo.findByTenantIdAndExternalShipmentId(input.tenantId(), input.externalShipmentId());
        if (existing.isPresent()) {
            var r = existing.get();
            return new Reservation(r.getId(), r.getTenantId(), r.getExternalShipmentId(), r.getStatus());
        }

        var reservation = new ReservationEntity(
            UUID.randomUUID(), input.tenantId(), input.customerId(),
            null, input.expectedWeightKg(), input.slotStart());
        reservation.setExternalSource(input.externalSource(), input.externalShipmentId());
        repo.save(reservation);
        return new Reservation(
            reservation.getId(), reservation.getTenantId(),
            reservation.getExternalShipmentId(), reservation.getStatus());
    }
}
