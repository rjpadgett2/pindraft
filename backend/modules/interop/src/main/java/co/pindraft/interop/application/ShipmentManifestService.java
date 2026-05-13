package co.pindraft.interop.application;

import co.pindraft.identity.domain.TenantCustomerEntity;
import co.pindraft.identity.infrastructure.TenantCustomerRepository;
import co.pindraft.mill_ops.ReservationCreator;
import co.pindraft.mill_ops.ReservationCreator.ExternalShipmentInput;
import co.pindraft.mill_ops.ReservationCreator.Reservation;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;
import org.jspecify.annotations.Nullable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Ingests external shipment manifests. Resolves the shepherd's {@code tenant_customers}
 * row by external identity via an indexed lookup; auto-creates a walk-in if no match
 * exists. Delegates to mill-ops's {@link ReservationCreator} for reservation creation,
 * which is idempotent on {@code external_shipment_id}.
 */
@Service
public class ShipmentManifestService {

    private final ReservationCreator reservationCreator;
    private final TenantCustomerRepository customers;

    public ShipmentManifestService(
        ReservationCreator reservationCreator,
        TenantCustomerRepository customers
    ) {
        this.reservationCreator = reservationCreator;
        this.customers = customers;
    }

    @Transactional
    public Reservation ingest(
        UUID tenantId,
        String externalShipmentId,
        String externalCustomerId,
        String customerDisplayName,
        BigDecimal expectedWeightKg,
        Instant slotStart,
        @Nullable String externalSource
    ) {
        var source = externalSource != null ? externalSource : "hirsel";
        var customer = resolveOrCreateCustomer(tenantId, externalCustomerId, customerDisplayName, source);

        return reservationCreator.createFromExternalShipment(new ExternalShipmentInput(
            tenantId,
            customer.getId(),
            expectedWeightKg,
            slotStart,
            source,
            externalShipmentId
        ));
    }

    private TenantCustomerEntity resolveOrCreateCustomer(
        UUID tenantId, String externalCustomerId, String displayName, String externalSource
    ) {
        return customers
            .findByTenantIdAndExternalSourceAndExternalUserId(tenantId, externalSource, externalCustomerId)
            .orElseGet(() -> customers.save(new TenantCustomerEntity(
                UUID.randomUUID(), tenantId, "SHEPHERD", displayName, null)));
    }
}
