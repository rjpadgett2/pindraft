package co.pindraft.identity.domain;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;
import org.jspecify.annotations.NullMarked;

@Entity
@Table(name = "tenant_memberships",
    uniqueConstraints = @UniqueConstraint(columnNames = {"user_id", "tenant_id"}))
@NullMarked
public class TenantMembershipEntity {
    @Id
    @Column(name = "id", columnDefinition = "uuid")
    private UUID id;

    @Column(name = "user_id", columnDefinition = "uuid", nullable = false)
    private UUID userId;

    @Column(name = "tenant_id", columnDefinition = "uuid", nullable = false)
    private UUID tenantId;

    @Column(name = "role", nullable = false)
    private String role; // MILL_ADMIN, MILL_OPERATOR

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    protected TenantMembershipEntity() {}

    public TenantMembershipEntity(UUID id, UUID userId, UUID tenantId, String role) {
        this.id = id;
        this.userId = userId;
        this.tenantId = tenantId;
        this.role = role;
        this.createdAt = Instant.now();
    }

    public UUID getId() { return id; }
    public UUID getUserId() { return userId; }
    public UUID getTenantId() { return tenantId; }
    public String getRole() { return role; }
    public Instant getCreatedAt() { return createdAt; }
}
