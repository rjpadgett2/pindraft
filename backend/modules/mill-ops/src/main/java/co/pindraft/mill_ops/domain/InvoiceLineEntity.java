package co.pindraft.mill_ops.domain;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.util.UUID;
import org.jspecify.annotations.NullMarked;

@Entity
@Table(name = "invoice_lines")
@NullMarked
public class InvoiceLineEntity {
    @Id
    @Column(name = "id", columnDefinition = "uuid")
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "invoice_id", nullable = false)
    private InvoiceEntity invoice;

    @Column(name = "description", nullable = false, length = 255)
    private String description;

    @Column(name = "quantity", precision = 12, scale = 3, nullable = false)
    private BigDecimal quantity;

    @Column(name = "unit", nullable = false, length = 16)
    private String unit;

    @Column(name = "unit_price_cents", nullable = false)
    private long unitPriceCents;

    @Column(name = "line_total_cents", nullable = false)
    private long lineTotalCents;

    protected InvoiceLineEntity() {}

    public InvoiceLineEntity(UUID id, String description, BigDecimal quantity, String unit,
                             long unitPriceCents, long lineTotalCents) {
        this.id = id;
        this.description = description;
        this.quantity = quantity;
        this.unit = unit;
        this.unitPriceCents = unitPriceCents;
        this.lineTotalCents = lineTotalCents;
    }

    void attachTo(InvoiceEntity invoice) { this.invoice = invoice; }

    public UUID getId() { return id; }
    public String getDescription() { return description; }
    public BigDecimal getQuantity() { return quantity; }
    public String getUnit() { return unit; }
    public long getUnitPriceCents() { return unitPriceCents; }
    public long getLineTotalCents() { return lineTotalCents; }
}
