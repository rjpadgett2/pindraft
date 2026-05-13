package co.pindraft.mill_ops.api;

import co.pindraft.common.security.TenantAccessGuard;
import co.pindraft.mill_ops.application.InvoicingService;
import co.pindraft.mill_ops.domain.InvoiceEntity;
import co.pindraft.mill_ops.domain.InvoiceLineEntity;
import co.pindraft.mill_ops.domain.InvoiceStatus;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/tenants/{tenantId}/invoices")
@Tag(name = "Billing", description = "Invoices generated from completed lots")
public class InvoiceController {

    private final InvoicingService service;
    private final TenantAccessGuard accessGuard;

    public InvoiceController(InvoicingService service, TenantAccessGuard accessGuard) {
        this.service = service;
        this.accessGuard = accessGuard;
    }

    @GetMapping
    @Operation(summary = "List invoices for a tenant. Optional customer_id filter.")
    public List<InvoiceResponse> list(
        @PathVariable UUID tenantId,
        @RequestParam(value = "customer_id", required = false) UUID customerId
    ) {
        accessGuard.requireStaffAccess(tenantId);
        var rows = customerId == null
            ? service.listForTenant(tenantId)
            : service.listForTenantCustomer(tenantId, customerId);
        return rows.stream().map(InvoiceController::toResponse).toList();
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get one invoice with line items")
    public InvoiceDetailResponse getOne(@PathVariable UUID tenantId, @PathVariable UUID id) {
        accessGuard.requireStaffAccess(tenantId);
        var inv = service.getOne(id);
        return new InvoiceDetailResponse(
            toResponse(inv),
            inv.getLines().stream().map(InvoiceController::toLineResponse).toList());
    }

    @PostMapping("/{id}/issue")
    @Operation(summary = "Move invoice from DRAFT to ISSUED")
    public InvoiceResponse issue(@PathVariable UUID tenantId, @PathVariable UUID id) {
        accessGuard.requireStaffAccess(tenantId);
        return toResponse(service.issue(id));
    }

    @PostMapping("/{id}/mark-paid")
    @Operation(summary = "Record payment received (manual entry for v1)")
    public InvoiceResponse markPaid(@PathVariable UUID tenantId, @PathVariable UUID id) {
        accessGuard.requireStaffAccess(tenantId);
        return toResponse(service.markPaid(id));
    }

    @PostMapping("/{id}/void")
    @Operation(summary = "Void an invoice (preserves audit trail)")
    public InvoiceResponse voidInvoice(@PathVariable UUID tenantId, @PathVariable UUID id) {
        accessGuard.requireStaffAccess(tenantId);
        return toResponse(service.markVoid(id));
    }

    private static InvoiceResponse toResponse(InvoiceEntity inv) {
        return new InvoiceResponse(
            inv.getId(), inv.getTenantId(), inv.getCustomerId(), inv.getLotId(),
            inv.getInvoiceNumber(), inv.getStatus(),
            inv.getSubtotalCents(), inv.getTotalCents(), inv.getCurrency(),
            inv.getNotes(), inv.getIssuedAt(), inv.getPaidAt(), inv.getCreatedAt());
    }

    private static InvoiceLineResponse toLineResponse(InvoiceLineEntity l) {
        return new InvoiceLineResponse(
            l.getId(), l.getDescription(), l.getQuantity(), l.getUnit(),
            l.getUnitPriceCents(), l.getLineTotalCents());
    }

    public record InvoiceResponse(
        UUID id, UUID tenantId, UUID customerId, UUID lotId,
        String invoiceNumber, InvoiceStatus status,
        long subtotalCents, long totalCents, String currency,
        String notes, Instant issuedAt, Instant paidAt, Instant createdAt) {}

    public record InvoiceDetailResponse(InvoiceResponse invoice, List<InvoiceLineResponse> lines) {}

    public record InvoiceLineResponse(
        UUID id, String description, BigDecimal quantity, String unit,
        long unitPriceCents, long lineTotalCents) {}
}
