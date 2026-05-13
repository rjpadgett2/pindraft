package co.pindraft.billing.domain;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import org.jspecify.annotations.NullMarked;

/**
 * Tenant-scoped pricing template. Discriminated by {@code kind}; the {@code config}
 * JSONB column carries shape-by-kind structured data validated at the service layer.
 */
@Entity
@Table(name = "pricing_arrangements")
@NullMarked
public class PricingArrangementEntity {
    @Id
    @Column(name = "id", columnDefinition = "uuid")
    private UUID id;

    @Column(name = "tenant_id", columnDefinition = "uuid", nullable = false)
    private UUID tenantId;

    @Column(name = "name", nullable = false)
    private String name;

    @Enumerated(EnumType.STRING)
    @Column(name = "kind", nullable = false, length = 32)
    private PricingKind kind;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "config", nullable = false, columnDefinition = "jsonb")
    private String configJson;

    @Column(name = "active", nullable = false)
    private boolean active;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    protected PricingArrangementEntity() {}

    public PricingArrangementEntity(UUID id, UUID tenantId, String name, PricingKind kind, String configJson) {
        this.id = id;
        this.tenantId = tenantId;
        this.name = name;
        this.kind = kind;
        this.configJson = configJson;
        this.active = true;
        var now = Instant.now();
        this.createdAt = now;
        this.updatedAt = now;
    }

    public UUID getId() { return id; }
    public UUID getTenantId() { return tenantId; }
    public String getName() { return name; }
    public PricingKind getKind() { return kind; }
    public String getConfigJson() { return configJson; }
    public boolean isActive() { return active; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }

    public void rename(String name) { this.name = name; touch(); }
    public void updateConfig(String configJson) { this.configJson = configJson; touch(); }
    public void deactivate() { this.active = false; touch(); }

    private void touch() { this.updatedAt = Instant.now(); }
}
