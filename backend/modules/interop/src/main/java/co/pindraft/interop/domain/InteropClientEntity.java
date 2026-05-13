package co.pindraft.interop.domain;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;
import org.jspecify.annotations.NullMarked;

/**
 * An external system (Hirsel, or a future partner) authorized to call interop endpoints
 * scoped to a single tenant. Holds a BCrypt hash of the bearer-token secret.
 *
 * <p>This is a v1 simplification of the full OAuth client model. Future iterations
 * will replace the bearer-token-with-tenant-scope with full OAuth+PKCE and per-user
 * delegated consent.
 */
@Entity
@Table(name = "interop_clients")
@NullMarked
public class InteropClientEntity {
    @Id
    @Column(name = "id", columnDefinition = "uuid")
    private UUID id;

    @Column(name = "tenant_id", columnDefinition = "uuid", nullable = false)
    private UUID tenantId;

    @Column(name = "name", nullable = false)
    private String name;

    @Column(name = "secret_hash", nullable = false)
    private String secretHash;

    @Column(name = "is_active", nullable = false)
    private boolean active;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    protected InteropClientEntity() {}

    public InteropClientEntity(UUID id, UUID tenantId, String name, String secretHash) {
        this.id = id;
        this.tenantId = tenantId;
        this.name = name;
        this.secretHash = secretHash;
        this.active = true;
        this.createdAt = Instant.now();
    }

    public UUID getId() { return id; }
    public UUID getTenantId() { return tenantId; }
    public String getName() { return name; }
    public String getSecretHash() { return secretHash; }
    public boolean isActive() { return active; }
    public Instant getCreatedAt() { return createdAt; }

    public void deactivate() { this.active = false; }
}
