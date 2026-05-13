package co.pindraft.interop.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import co.pindraft.identity.domain.TenantCustomerEntity;
import co.pindraft.identity.infrastructure.TenantCustomerRepository;
import co.pindraft.mill_ops.ReservationCreator;
import co.pindraft.mill_ops.ReservationCreator.ExternalShipmentInput;
import co.pindraft.mill_ops.domain.ReservationStatus;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class ShipmentManifestServiceTest {

    @Mock private ReservationCreator reservationCreator;
    @Mock private TenantCustomerRepository customers;
    private ShipmentManifestService service;

    private UUID tenantId;

    @BeforeEach
    void setUp() {
        service = new ShipmentManifestService(reservationCreator, customers);
        tenantId = UUID.randomUUID();
    }

    @Test
    void ingest_with_no_existing_customer_creates_walk_in_and_delegates() {
        when(customers.findAll()).thenReturn(List.of());
        when(customers.save(any(TenantCustomerEntity.class)))
            .thenAnswer(inv -> inv.getArgument(0));
        var expected = new ReservationCreator.Reservation(
            UUID.randomUUID(), tenantId, "SHIP-001", ReservationStatus.PENDING);
        when(reservationCreator.createFromExternalShipment(any(ExternalShipmentInput.class)))
            .thenReturn(expected);

        var result = service.ingest(
            tenantId, "SHIP-001", "hirsel-shepherd-42", "Bramble Farm",
            new BigDecimal("12.5"), Instant.now(), "hirsel");

        assertThat(result.externalShipmentId()).isEqualTo("SHIP-001");
        verify(customers).save(any(TenantCustomerEntity.class));  // walk-in created
        verify(reservationCreator).createFromExternalShipment(any(ExternalShipmentInput.class));
    }
}
