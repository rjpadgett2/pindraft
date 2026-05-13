package co.pindraft.mill_ops.application;

import co.pindraft.mill_ops.domain.*;
import co.pindraft.mill_ops.events.LotCompletedEvent;
import co.pindraft.mill_ops.infrastructure.InvoiceRepository;
import co.pindraft.mill_ops.infrastructure.LotRepository;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.jspecify.annotations.Nullable;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.modulith.events.ApplicationModuleListener;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

/**
 * Generates a draft invoice when a lot completes.
 *
 * <p>Wired via {@link ApplicationModuleListener} so the invoice creation runs in its
 * own transaction after the lot-completion transaction commits — same pattern Spring
 * Modulith uses for the webhook dispatcher in interop. Failures here don't roll back
 * the lot completion; the operator can regenerate the invoice manually.
 *
 * <p>The pricing snapshot frozen onto the lot at intake is the source of truth for
 * line computation; we never reach back into the {@code pricing_arrangements} table
 * (which might have drifted since intake).
 *
 * <p>Skipped when:
 * <ul>
 *   <li>The lot is pool-merged ({@code lot.poolId != null}) — settlement_distributions
 *       in the pools module handles those payouts.</li>
 *   <li>Pricing kind is {@code REVENUE_SPLIT} — revenue isn't realized at completion,
 *       only when finished product sells.</li>
 *   <li>No pricing snapshot is present — admin can attach one and trigger
 *       regeneration via the invoice controller.</li>
 * </ul>
 */
@Service
public class InvoicingService {

    private static final Logger log = LoggerFactory.getLogger(InvoicingService.class);
    private static final String DEFAULT_CURRENCY = "USD";

    private final InvoiceRepository invoices;
    private final LotRepository lots;
    private final ObjectMapper mapper;

    public InvoicingService(InvoiceRepository invoices, LotRepository lots, ObjectMapper mapper) {
        this.invoices = invoices;
        this.lots = lots;
        this.mapper = mapper;
    }

    @ApplicationModuleListener
    public void onLotCompleted(LotCompletedEvent event) {
        if (invoices.findByLotId(event.lotId()).isPresent()) {
            log.debug("Invoice already exists for lot {} — skipping auto-generation", event.lotId());
            return;
        }
        var lot = lots.findById(event.lotId()).orElse(null);
        if (lot != null && lot.getPoolId() != null) {
            log.info("Lot {} is pool-merged — skipping invoice (settlement handles payout)", event.lotId());
            return;
        }
        if (event.pricingKindSnapshot() == null || event.pricingConfigSnapshot() == null) {
            log.info("Lot {} has no pricing snapshot — skipping auto-invoice", event.lotId());
            return;
        }
        if ("REVENUE_SPLIT".equals(event.pricingKindSnapshot())) {
            log.info("Lot {} is REVENUE_SPLIT — no invoice at completion (revenue realizes on sale)", event.lotId());
            return;
        }
        generateForCompletedLot(event);
    }

    @Transactional
    public InvoiceEntity generateForCompletedLot(LotCompletedEvent event) {
        var billingWeight = Optional.ofNullable(event.finalWeightKg())
            .orElse(Optional.ofNullable(event.weightIntakeKg()).orElse(BigDecimal.ZERO));

        var lines = buildLines(event.pricingKindSnapshot(), event.pricingConfigSnapshot(), billingWeight);

        var invoiceNumber = nextInvoiceNumberFor(event.tenantId());
        var invoice = new InvoiceEntity(
            UUID.randomUUID(), event.tenantId(), event.customerId(), event.lotId(),
            invoiceNumber, DEFAULT_CURRENCY);
        lines.forEach(invoice::addLine);
        invoices.save(invoice);
        log.info("Generated invoice {} for lot {} (subtotal: {} cents)",
            invoiceNumber, event.lotId(), invoice.getSubtotalCents());
        return invoice;
    }

    @Transactional
    public InvoiceEntity issue(UUID invoiceId) {
        var inv = invoices.findById(invoiceId).orElseThrow(() -> new InvoiceNotFoundException(invoiceId));
        inv.issue();
        return invoices.save(inv);
    }

    @Transactional
    public InvoiceEntity markPaid(UUID invoiceId) {
        var inv = invoices.findById(invoiceId).orElseThrow(() -> new InvoiceNotFoundException(invoiceId));
        inv.markPaid();
        return invoices.save(inv);
    }

    @Transactional
    public InvoiceEntity markVoid(UUID invoiceId) {
        var inv = invoices.findById(invoiceId).orElseThrow(() -> new InvoiceNotFoundException(invoiceId));
        inv.markVoid();
        return invoices.save(inv);
    }

    public List<InvoiceEntity> listForTenant(UUID tenantId) {
        return invoices.findByTenantIdOrderByCreatedAtDesc(tenantId);
    }

    public List<InvoiceEntity> listForTenantCustomer(UUID tenantId, UUID customerId) {
        return invoices.findByTenantIdAndCustomerIdOrderByCreatedAtDesc(tenantId, customerId);
    }

    public InvoiceEntity getOne(UUID id) {
        return invoices.findById(id).orElseThrow(() -> new InvoiceNotFoundException(id));
    }

    private List<InvoiceLineEntity> buildLines(String pricingKind, String configJson, BigDecimal weightKg) {
        JsonNode cfg = parseConfig(configJson);
        return switch (pricingKind) {
            case "PER_POUND"        -> buildPerKgLine(cfg, weightKg, "Processing fee");
            case "HYBRID"           -> buildHybridLines(cfg, weightKg);
            case "TIERED_BY_GRADE"  -> buildTieredLines(cfg, weightKg);
            default                 -> List.of();
        };
    }

    private List<InvoiceLineEntity> buildPerKgLine(JsonNode cfg, BigDecimal weightKg, String description) {
        var pricePerKgCents = dollarsToCents(cfg.path("pricePerKg"));
        long lineTotalCents = weightKg.multiply(BigDecimal.valueOf(pricePerKgCents))
            .setScale(0, RoundingMode.HALF_UP).longValueExact();
        return List.of(new InvoiceLineEntity(
            UUID.randomUUID(), description, weightKg, "kg", pricePerKgCents, lineTotalCents));
    }

    private List<InvoiceLineEntity> buildHybridLines(JsonNode cfg, BigDecimal weightKg) {
        var flatCents = dollarsToCents(cfg.path("flatFee"));
        var perKgCents = dollarsToCents(cfg.path("pricePerKg"));
        var perKgTotal = weightKg.multiply(BigDecimal.valueOf(perKgCents))
            .setScale(0, RoundingMode.HALF_UP).longValueExact();
        var out = new ArrayList<InvoiceLineEntity>();
        out.add(new InvoiceLineEntity(UUID.randomUUID(), "Flat fee", BigDecimal.ONE, "each",
            flatCents, flatCents));
        out.add(new InvoiceLineEntity(UUID.randomUUID(), "Processing fee", weightKg, "kg",
            perKgCents, perKgTotal));
        return out;
    }

    private List<InvoiceLineEntity> buildTieredLines(JsonNode cfg, BigDecimal weightKg) {
        // v1: pick the lowest-priced (i.e., highest-quality / lowest-micron) tier if no
        // fiber test is attached. When fiber tests come online (#5), this becomes a
        // micron-matched tier selection.
        JsonNode tiers = cfg.path("tiers");
        long unitPriceCents = 0;
        for (JsonNode tier : tiers) {
            var p = dollarsToCents(tier.path("pricePerKg"));
            if (p > unitPriceCents) unitPriceCents = p;  // pick the maximum (conservative)
        }
        long lineTotal = weightKg.multiply(BigDecimal.valueOf(unitPriceCents))
            .setScale(0, RoundingMode.HALF_UP).longValueExact();
        return List.of(new InvoiceLineEntity(
            UUID.randomUUID(), "Processing fee (tiered — micron test pending)",
            weightKg, "kg", unitPriceCents, lineTotal));
    }

    private long dollarsToCents(@Nullable JsonNode node) {
        if (node == null || node.isMissingNode() || node.isNull()) return 0L;
        var dec = node.decimalValue();
        return dec.multiply(BigDecimal.valueOf(100)).setScale(0, RoundingMode.HALF_UP).longValueExact();
    }

    private JsonNode parseConfig(String json) {
        try {
            return mapper.readTree(json);
        } catch (RuntimeException e) {
            log.warn("Failed to parse pricing snapshot — falling back to empty config", e);
            return mapper.nullNode();
        }
    }

    private String nextInvoiceNumberFor(UUID tenantId) {
        long next = invoices.countByTenantId(tenantId) + 1;
        return String.format("INV-%06d", next);
    }
}
