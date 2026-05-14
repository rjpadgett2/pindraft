package co.pindraft.mill_ops.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import co.pindraft.mill_ops.domain.InvoiceEntity;
import co.pindraft.mill_ops.domain.LotEntity;
import co.pindraft.mill_ops.events.LotCompletedEvent;
import co.pindraft.mill_ops.infrastructure.InvoiceRepository;
import co.pindraft.mill_ops.infrastructure.LotRepository;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import tools.jackson.databind.ObjectMapper;

/**
 * Tests for {@link InvoicingService}. Locks in the line-computation math across the
 * four pricing kinds and the skip-conditions (pool-merged lots, REVENUE_SPLIT,
 * missing snapshot, already-invoiced) so a regression turns red here rather than in
 * the production money path.
 */
@ExtendWith(MockitoExtension.class)
class InvoicingServiceTest {

    @Mock private InvoiceRepository invoices;
    @Mock private LotRepository lots;
    private final ObjectMapper mapper = new ObjectMapper();
    private InvoicingService service;

    private final UUID TENANT = UUID.randomUUID();
    private final UUID CUSTOMER = UUID.randomUUID();
    private final UUID LOT = UUID.randomUUID();

    @BeforeEach
    void setUp() {
        service = new InvoicingService(invoices, lots, mapper);
        // Default behaviour for the listener path: no existing invoice, no pool-merged lot.
        when(invoices.findByLotId(any())).thenReturn(Optional.empty());
    }

    @Test
    void per_pound_generates_single_line_at_weight_times_price() {
        var event = completedEvent("PER_POUND", "{\"pricePerKg\": 5.50}",
            new BigDecimal("7.30"), new BigDecimal("6.50"));
        when(lots.findById(LOT)).thenReturn(Optional.of(activeLot(null)));

        service.onLotCompleted(event);

        var inv = capturedInvoice();
        assertThat(inv.getLines()).hasSize(1);
        var line = inv.getLines().get(0);
        // 6.50 kg × $5.50 = $35.75 = 3575 cents
        assertThat(line.getUnitPriceCents()).isEqualTo(550L);
        assertThat(line.getLineTotalCents()).isEqualTo(3575L);
        assertThat(line.getQuantity()).isEqualByComparingTo("6.50");
        assertThat(line.getUnit()).isEqualTo("kg");
        assertThat(inv.getSubtotalCents()).isEqualTo(3575L);
        assertThat(inv.getTotalCents()).isEqualTo(3575L);
    }

    @Test
    void hybrid_expands_to_flat_fee_plus_per_kg_lines() {
        var event = completedEvent("HYBRID", "{\"flatFee\": 25.00, \"pricePerKg\": 3.00}",
            new BigDecimal("10.00"), new BigDecimal("8.00"));
        when(lots.findById(LOT)).thenReturn(Optional.of(activeLot(null)));

        service.onLotCompleted(event);

        var inv = capturedInvoice();
        assertThat(inv.getLines()).hasSize(2);
        // Line 1: flat fee $25 = 2500 cents
        assertThat(inv.getLines().get(0).getDescription()).isEqualTo("Flat fee");
        assertThat(inv.getLines().get(0).getLineTotalCents()).isEqualTo(2500L);
        assertThat(inv.getLines().get(0).getUnit()).isEqualTo("each");
        // Line 2: 8.00 kg × $3.00 = $24.00 = 2400 cents
        assertThat(inv.getLines().get(1).getLineTotalCents()).isEqualTo(2400L);
        assertThat(inv.getLines().get(1).getUnit()).isEqualTo("kg");
        // Subtotal = 4900 cents
        assertThat(inv.getSubtotalCents()).isEqualTo(4900L);
    }

    @Test
    void tiered_by_grade_picks_highest_tier_price_pending_test_data() {
        // v1 behaviour without fiber-test attachment: pick the highest-priced tier
        // (the most-conservative-to-the-shepherd choice).
        var event = completedEvent(
            "TIERED_BY_GRADE",
            "{\"tiers\":[{\"maxMicron\":22,\"pricePerKg\":8.00},{\"maxMicron\":30,\"pricePerKg\":4.00}]}",
            new BigDecimal("5.00"), new BigDecimal("5.00"));
        when(lots.findById(LOT)).thenReturn(Optional.of(activeLot(null)));

        service.onLotCompleted(event);

        var inv = capturedInvoice();
        assertThat(inv.getLines()).hasSize(1);
        // 5.00 kg × $8.00 (max-priced tier) = $40.00 = 4000 cents
        assertThat(inv.getLines().get(0).getUnitPriceCents()).isEqualTo(800L);
        assertThat(inv.getLines().get(0).getLineTotalCents()).isEqualTo(4000L);
    }

    @Test
    void revenue_split_skips_invoice_generation() {
        // No revenue realized at completion — REVENUE_SPLIT pays out on listing.sold.
        var event = completedEvent("REVENUE_SPLIT", "{\"millPercent\":40,\"brandPercent\":60}",
            new BigDecimal("5.00"), new BigDecimal("4.50"));

        service.onLotCompleted(event);

        verify(invoices, never()).save(any());
    }

    @Test
    void pool_merged_lot_skips_invoice_generation() {
        // Pool-merged lots settle via pools.settlement_distributions, not per-lot invoices.
        var event = completedEvent("PER_POUND", "{\"pricePerKg\": 5.50}",
            new BigDecimal("10.00"), new BigDecimal("9.50"));
        var lot = activeLot(UUID.randomUUID());  // poolId set
        when(lots.findById(LOT)).thenReturn(Optional.of(lot));

        service.onLotCompleted(event);

        verify(invoices, never()).save(any());
    }

    @Test
    void missing_pricing_snapshot_skips_invoice_generation() {
        var event = completedEvent(null, null,
            new BigDecimal("5.00"), new BigDecimal("4.50"));

        service.onLotCompleted(event);

        verify(invoices, never()).save(any());
    }

    @Test
    void existing_invoice_for_lot_skips_regeneration() {
        // Idempotency — DB unique key on lot_id enforces this, but service checks first
        // so it doesn't waste a transaction.
        var event = completedEvent("PER_POUND", "{\"pricePerKg\": 5.50}",
            new BigDecimal("7.00"), new BigDecimal("6.50"));
        var existing = new InvoiceEntity(
            UUID.randomUUID(), TENANT, CUSTOMER, LOT, "INV-EXIST", "USD");
        when(invoices.findByLotId(LOT)).thenReturn(Optional.of(existing));

        service.onLotCompleted(event);

        verify(invoices, never()).save(any());
    }

    @Test
    void falls_back_to_intake_weight_when_final_weight_missing() {
        var event = completedEvent("PER_POUND", "{\"pricePerKg\": 5.50}",
            new BigDecimal("7.30"), null);
        when(lots.findById(LOT)).thenReturn(Optional.of(activeLot(null)));

        service.onLotCompleted(event);

        var inv = capturedInvoice();
        // 7.30 kg × $5.50 = $40.15 = 4015 cents
        assertThat(inv.getLines().get(0).getLineTotalCents()).isEqualTo(4015L);
    }

    private LotCompletedEvent completedEvent(
        String pricingKind, String pricingConfig,
        BigDecimal intakeKg, BigDecimal finalKg
    ) {
        return new LotCompletedEvent(
            LOT, TENANT, CUSTOMER, intakeKg, finalKg,
            pricingKind, pricingConfig, Instant.now());
    }

    private LotEntity activeLot(UUID poolId) {
        var lot = new LotEntity(LOT, TENANT, CUSTOMER);
        if (poolId != null) lot.linkToPool(poolId);
        return lot;
    }

    private InvoiceEntity capturedInvoice() {
        var captor = ArgumentCaptor.forClass(InvoiceEntity.class);
        verify(invoices, times(1)).save(captor.capture());
        return captor.getValue();
    }
}
