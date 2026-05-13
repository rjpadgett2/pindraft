package co.pindraft.mill_ops.domain;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import org.jspecify.annotations.NullMarked;
import org.jspecify.annotations.Nullable;

/**
 * An invoice generated from a completed lot. One per lot (the unique key on lot_id
 * enforces this). Money is stored in integer cents.
 */
@Entity
@Table(name = "invoices")
@NullMarked
public class InvoiceEntity {
    @Id
    @Column(name = "id", columnDefinition = "uuid")
    private UUID id;

    @Column(name = "tenant_id", columnDefinition = "uuid", nullable = false)
    private UUID tenantId;

    @Column(name = "customer_id", columnDefinition = "uuid", nullable = false)
    private UUID customerId;

    @Column(name = "lot_id", columnDefinition = "uuid", nullable = false)
    private UUID lotId;

    @Column(name = "invoice_number", nullable = false, length = 64)
    private String invoiceNumber;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 32)
    private InvoiceStatus status;

    @Column(name = "subtotal_cents", nullable = false)
    private long subtotalCents;

    @Column(name = "total_cents", nullable = false)
    private long totalCents;

    @Column(name = "currency", nullable = false, length = 3)
    private String currency;

    @Column(name = "notes") @Nullable
    private String notes;

    @Column(name = "issued_at") @Nullable
    private Instant issuedAt;

    @Column(name = "paid_at") @Nullable
    private Instant paidAt;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @OneToMany(mappedBy = "invoice", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.EAGER)
    private List<InvoiceLineEntity> lines = new ArrayList<>();

    protected InvoiceEntity() {}

    public InvoiceEntity(UUID id, UUID tenantId, UUID customerId, UUID lotId,
                         String invoiceNumber, String currency) {
        this.id = id;
        this.tenantId = tenantId;
        this.customerId = customerId;
        this.lotId = lotId;
        this.invoiceNumber = invoiceNumber;
        this.currency = currency;
        this.status = InvoiceStatus.DRAFT;
        this.createdAt = Instant.now();
    }

    public void addLine(InvoiceLineEntity line) {
        line.attachTo(this);
        this.lines.add(line);
        recomputeTotals();
    }

    public void issue() {
        if (status != InvoiceStatus.DRAFT) return;
        this.status = InvoiceStatus.ISSUED;
        this.issuedAt = Instant.now();
    }

    public void markPaid() {
        this.status = InvoiceStatus.PAID;
        this.paidAt = Instant.now();
    }

    public void markVoid() {
        this.status = InvoiceStatus.VOID;
    }

    public void setNotes(@Nullable String notes) { this.notes = notes; }

    private void recomputeTotals() {
        long sum = lines.stream().mapToLong(InvoiceLineEntity::getLineTotalCents).sum();
        this.subtotalCents = sum;
        this.totalCents = sum;  // no taxes / discounts yet
    }

    public UUID getId() { return id; }
    public UUID getTenantId() { return tenantId; }
    public UUID getCustomerId() { return customerId; }
    public UUID getLotId() { return lotId; }
    public String getInvoiceNumber() { return invoiceNumber; }
    public InvoiceStatus getStatus() { return status; }
    public long getSubtotalCents() { return subtotalCents; }
    public long getTotalCents() { return totalCents; }
    public String getCurrency() { return currency; }
    @Nullable public String getNotes() { return notes; }
    @Nullable public Instant getIssuedAt() { return issuedAt; }
    @Nullable public Instant getPaidAt() { return paidAt; }
    public Instant getCreatedAt() { return createdAt; }
    public List<InvoiceLineEntity> getLines() { return lines; }
}
