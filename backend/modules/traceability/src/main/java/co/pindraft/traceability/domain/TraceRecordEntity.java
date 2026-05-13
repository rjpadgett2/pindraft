package co.pindraft.traceability.domain;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;
import org.jspecify.annotations.NullMarked;

/**
 * One record per lot. Created at intake. The slug is the public URL component
 * (e.g. {@code /trace/{slug}}). Visibility starts off; the lot's customer can flip
 * it on to enable public lookup.
 *
 * <p>Customer display name is denormalized here at write time. We don't want the public
 * trace to require a join into tenant_customers, and the name shown is what the customer
 * had at intake time — even if they rename themselves later.
 */
@Entity
@Table(name = "trace_records")
@NullMarked
public class TraceRecordEntity {
    @Id
    @Column(name = "id", columnDefinition = "uuid")
    private UUID id;

    @Column(name = "lot_id", columnDefinition = "uuid", nullable = false, unique = true)
    private UUID lotId;

    @Column(name = "slug", nullable = false, unique = true, length = 16)
    private String slug;

    @Column(name = "public_visible", nullable = false)
    private boolean publicVisible;

    @Column(name = "customer_display_name", nullable = false)
    private String customerDisplayName;

    @Column(name = "intake_weight_kg", precision = 10, scale = 2)
    private BigDecimal intakeWeightKg;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    protected TraceRecordEntity() {}

    public TraceRecordEntity(UUID id, UUID lotId, String slug,
                             String customerDisplayName, BigDecimal intakeWeightKg) {
        this.id = id;
        this.lotId = lotId;
        this.slug = slug;
        this.publicVisible = false;
        this.customerDisplayName = customerDisplayName;
        this.intakeWeightKg = intakeWeightKg;
        var now = Instant.now();
        this.createdAt = now;
        this.updatedAt = now;
    }

    public UUID getId() { return id; }
    public UUID getLotId() { return lotId; }
    public String getSlug() { return slug; }
    public boolean isPublicVisible() { return publicVisible; }
    public String getCustomerDisplayName() { return customerDisplayName; }
    public BigDecimal getIntakeWeightKg() { return intakeWeightKg; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }

    public void setPublicVisible(boolean visible) {
        this.publicVisible = visible;
        this.updatedAt = Instant.now();
    }
}
