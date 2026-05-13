package co.pindraft.marketplace.domain;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;
import org.jspecify.annotations.NullMarked;
import org.jspecify.annotations.Nullable;

/**
 * A marketplace listing. Tenant-scoped for write/admin operations, surfaces to the
 * public-shared layer when published. The optional {@code traceSlug} attaches a lot's
 * provenance trace to the listing — public viewers see a link to {@code /trace/{slug}}.
 */
@Entity
@Table(name = "marketplace_listings")
@NullMarked
public class ListingEntity {
    @Id
    @Column(name = "id", columnDefinition = "uuid")
    private UUID id;

    @Column(name = "tenant_id", columnDefinition = "uuid", nullable = false)
    private UUID tenantId;

    @Enumerated(EnumType.STRING)
    @Column(name = "kind", nullable = false, length = 16)
    private ListingKind kind;

    @Column(name = "title", nullable = false)
    private String title;

    @Column(name = "description", columnDefinition = "text") @Nullable
    private String description;

    @Column(name = "price_per_kg", nullable = false, precision = 10, scale = 2)
    private BigDecimal pricePerKg;

    @Column(name = "quantity_kg", nullable = false, precision = 10, scale = 2)
    private BigDecimal quantityKg;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 16)
    private ListingStatus status;

    @Column(name = "trace_slug", length = 16) @Nullable
    private String traceSlug;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @Column(name = "published_at") @Nullable
    private Instant publishedAt;

    protected ListingEntity() {}

    public ListingEntity(UUID id, UUID tenantId, ListingKind kind, String title,
                         @Nullable String description, BigDecimal pricePerKg, BigDecimal quantityKg) {
        this.id = id;
        this.tenantId = tenantId;
        this.kind = kind;
        this.title = title;
        this.description = description;
        this.pricePerKg = pricePerKg;
        this.quantityKg = quantityKg;
        this.status = ListingStatus.DRAFT;
        var now = Instant.now();
        this.createdAt = now;
        this.updatedAt = now;
    }

    public UUID getId() { return id; }
    public UUID getTenantId() { return tenantId; }
    public ListingKind getKind() { return kind; }
    public String getTitle() { return title; }
    @Nullable public String getDescription() { return description; }
    public BigDecimal getPricePerKg() { return pricePerKg; }
    public BigDecimal getQuantityKg() { return quantityKg; }
    public ListingStatus getStatus() { return status; }
    @Nullable public String getTraceSlug() { return traceSlug; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }
    @Nullable public Instant getPublishedAt() { return publishedAt; }

    public void publish() {
        if (this.status != ListingStatus.DRAFT) {
            throw new IllegalStateException("Only DRAFT listings can be published; current: " + status);
        }
        this.status = ListingStatus.PUBLISHED;
        this.publishedAt = Instant.now();
        touch();
    }

    public void markSold() {
        if (this.status != ListingStatus.PUBLISHED) {
            throw new IllegalStateException("Only PUBLISHED listings can be sold; current: " + status);
        }
        this.status = ListingStatus.SOLD;
        touch();
    }

    public void archive() {
        if (this.status == ListingStatus.SOLD) {
            throw new IllegalStateException("Cannot archive a SOLD listing");
        }
        this.status = ListingStatus.ARCHIVED;
        touch();
    }

    public void updateContent(@Nullable String title, @Nullable String description,
                              @Nullable BigDecimal pricePerKg, @Nullable BigDecimal quantityKg,
                              @Nullable String traceSlug) {
        if (title != null && !title.isBlank()) this.title = title;
        if (description != null) this.description = description;
        if (pricePerKg != null) this.pricePerKg = pricePerKg;
        if (quantityKg != null) this.quantityKg = quantityKg;
        if (traceSlug != null) this.traceSlug = traceSlug.isBlank() ? null : traceSlug;
        touch();
    }

    private void touch() { this.updatedAt = Instant.now(); }
}
