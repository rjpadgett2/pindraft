package co.pindraft.mill_ops.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import co.pindraft.billing.PricingArrangementLookup;
import co.pindraft.identity.domain.TenantCustomerEntity;
import co.pindraft.identity.infrastructure.TenantCustomerRepository;
import co.pindraft.mill_ops.domain.*;
import co.pindraft.mill_ops.infrastructure.*;
import co.pindraft.traceability.TraceEmitter;
import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class LotServiceTest {

    @Mock private LotRepository lots;
    @Mock private ReservationRepository reservations;
    @Mock private WorkflowStageRepository workflowStages;
    @Mock private LotStageEventRepository stageEvents;
    @Mock private IntakeFleeceRepository intakeFleeces;
    @Mock private ScanEventRepository scanEvents;
    @Mock private PricingArrangementLookup pricingLookup;
    @Mock private EquipmentRunService equipmentRunService;
    @Mock private TenantCustomerRepository customers;
    @Mock private TraceEmitter traceEmitter;

    private LotService service;

    private UUID tenantId;
    private UUID reservationId;
    private UUID intakeStageId;
    private UUID sortStageId;
    private UUID customerId;
    private UUID pricingArrangementId;
    private UUID lotId;
    private ReservationEntity reservation;
    private WorkflowStageEntity intakeStage;
    private WorkflowStageEntity sortStage;
    private TenantCustomerEntity customer;

    @BeforeEach
    void setUp() {
        service = new LotService(
            lots, reservations, workflowStages, stageEvents,
            intakeFleeces, scanEvents, pricingLookup, equipmentRunService,
            customers, traceEmitter);

        tenantId = UUID.randomUUID();
        reservationId = UUID.randomUUID();
        intakeStageId = UUID.randomUUID();
        sortStageId = UUID.randomUUID();
        customerId = UUID.randomUUID();
        pricingArrangementId = UUID.randomUUID();
        lotId = UUID.randomUUID();

        reservation = new ReservationEntity(
            reservationId, tenantId, customerId, pricingArrangementId,
            new BigDecimal("12.0"), java.time.Instant.now());
        intakeStage = new WorkflowStageEntity(
            intakeStageId, tenantId, "INTAKE", "Intake", 10, false);
        sortStage = new WorkflowStageEntity(
            sortStageId, tenantId, "SORT", "Sort & skirt", 20, false);
        customer = new TenantCustomerEntity(customerId, tenantId, "SHEPHERD", "Bramble Farm", null);
    }

    @Test
    void intake_creates_lot_and_emits_trace_record() {
        when(reservations.findById(reservationId)).thenReturn(Optional.of(reservation));
        when(workflowStages.findByTenantIdOrderByOrderIndex(tenantId)).thenReturn(List.of(intakeStage));
        when(pricingLookup.snapshot(pricingArrangementId)).thenReturn(Optional.empty());
        when(customers.findById(customerId)).thenReturn(Optional.of(customer));

        var fleeces = List.of(
            new LotService.FleeceInput(new BigDecimal("4.0"), "Bramble", "ROMNEY", null),
            new LotService.FleeceInput(new BigDecimal("3.8"), "Hawthorn", "ROMNEY", null));

        var lot = service.intake(tenantId, reservationId, fleeces, null);

        assertThat(lot.getWeightIntakeKg()).isEqualByComparingTo("7.8");
        assertThat(reservation.getStatus()).isEqualTo(ReservationStatus.RECEIVED);
        verify(traceEmitter).emitIntake(any(TraceEmitter.IntakeData.class));
    }

    @Test
    void transition_closes_old_event_opens_new_and_emits_trace_segment() {
        var lot = new LotEntity(lotId, tenantId, customerId);
        lot.setCurrentStageId(intakeStageId);
        var openEvent = new LotStageEventEntity(
            UUID.randomUUID(), lotId, intakeStageId, new BigDecimal("7.8"), null);

        when(lots.findById(lotId)).thenReturn(Optional.of(lot));
        when(stageEvents.findOpenForLot(lotId)).thenReturn(Optional.of(openEvent));
        when(workflowStages.findByTenantIdOrderByOrderIndex(tenantId))
            .thenReturn(List.of(intakeStage, sortStage));

        service.transitionToNextStage(
            tenantId, lotId, null, new BigDecimal("7.6"), null, null, null);

        verify(traceEmitter).emitStageTransition(lotId, "SORT", new BigDecimal("7.6"));
    }

    @Test
    void transition_rejects_lot_with_no_open_stage_event() {
        var lot = new LotEntity(lotId, tenantId, customerId);
        lot.setCurrentStageId(intakeStageId);
        when(lots.findById(lotId)).thenReturn(Optional.of(lot));
        when(stageEvents.findOpenForLot(lotId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.transitionToNextStage(
            tenantId, lotId, null, new BigDecimal("7.6"), null, null, null))
            .isInstanceOf(InvalidLotStateException.class);
    }
}
