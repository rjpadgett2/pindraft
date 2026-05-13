package co.pindraft.pools.domain;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;
import org.jspecify.annotations.NullMarked;
import org.jspecify.annotations.Nullable;

@Entity
@Table(name = "pools")
@NullMarked
public class PoolEntity {
    @Id
    @Column(name = "id", columnDefinition = "uuid")
    private UUID id;

    @Column(name = "tenant_id", columnDefinition = "uuid", nullable = false)
    private UUID tenantId;

    @Column(name = "name", nullable = false)
    private String name;

    @Column(name = "description", columnDefinition = "text") @Nullable
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(name = "kind", nullable = false, length = 32)
    private PoolKind kind;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 16)
    private PoolStatus status;

    @Column(name = "total_revenue", precision = 12, scale = 2) @Nullable
    private BigDecimal totalRevenue;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @Column(name = "closed_at") @Nullable
    private Instant closedAt;

    @Column(name = "distributed_at") @Nullable
    private Instant distributedAt;

    protected PoolEntity() {}

    public PoolEntity(UUID id, UUID tenantId, String name, @Nullable String description, PoolKind kind) {
        this.id = id;
        this.tenantId = tenantId;
        this.name = name;
        this.description = description;
        this.kind = kind;
        this.status = PoolStatus.ACCEPTING;
        var now = Instant.now();
        this.createdAt = now;
        this.updatedAt = now;
    }

    public UUID getId() { return id; }
    public UUID getTenantId() { return tenantId; }
    public String getName() { return name; }
    @Nullable public String getDescription() { return description; }
    public PoolKind getKind() { return kind; }
    public PoolStatus getStatus() { return status; }
    @Nullable public BigDecimal getTotalRevenue() { return totalRevenue; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }
    @Nullable public Instant getClosedAt() { return closedAt; }
    @Nullable public Instant getDistributedAt() { return distributedAt; }

    public void close() {
        if (this.status != PoolStatus.ACCEPTING) {
            throw new IllegalStateException("Only ACCEPTING pools can be closed; current: " + status);
        }
        this.status = PoolStatus.CLOSED;
        this.closedAt = Instant.now();
        this.updatedAt = this.closedAt;
    }

    public void distribute(BigDecimal totalRevenue) {
        if (this.status != PoolStatus.CLOSED) {
            throw new IllegalStateException("Only CLOSED pools can be distributed; current: " + status);
        }
        this.totalRevenue = totalRevenue;
        this.status = PoolStatus.DISTRIBUTED;
        this.distributedAt = Instant.now();
        this.updatedAt = this.distributedAt;
    }
}
