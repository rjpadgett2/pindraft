package co.pindraft.interop.oauth.domain;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;
import org.jspecify.annotations.NullMarked;
import org.jspecify.annotations.Nullable;

/**
 * An issued OAuth access token. Opaque to clients (we never structure them as JWTs in
 * v1) — clients send the full string, we look it up by hash and pull the scope from
 * here.
 *
 * <p>Why opaque: revocation. JWTs are stateless and unrevokable mid-lifetime; opaque
 * tokens with database lookup can be invalidated immediately. The token endpoint
 * additionally returns a structured ID-token-style JWT for the client's display, but
 * the access token is opaque.
 *
 * <p>1-hour TTL. Refresh tokens (separate entity) extend the session.
 */
@Entity
@Table(name = "oauth_access_tokens")
@NullMarked
public class AccessTokenEntity {
    @Id
    @Column(name = "id", columnDefinition = "uuid")
    private UUID id;

    @Column(name = "token_hash", nullable = false, unique = true, length = 128)
    private String tokenHash;

    @Column(name = "client_id", columnDefinition = "uuid", nullable = false)
    private UUID clientId;

    @Column(name = "user_id", columnDefinition = "uuid", nullable = false)
    private UUID userId;

    @Column(name = "tenant_id", columnDefinition = "uuid", nullable = false)
    private UUID tenantId;

    @Column(name = "scope", nullable = false)
    private String scope;

    @Column(name = "expires_at", nullable = false)
    private Instant expiresAt;

    @Column(name = "revoked_at") @Nullable
    private Instant revokedAt;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    protected AccessTokenEntity() {}

    public AccessTokenEntity(UUID id, String tokenHash, UUID clientId, UUID userId,
                              UUID tenantId, String scope, Instant expiresAt) {
        this.id = id;
        this.tokenHash = tokenHash;
        this.clientId = clientId;
        this.userId = userId;
        this.tenantId = tenantId;
        this.scope = scope;
        this.expiresAt = expiresAt;
        this.createdAt = Instant.now();
    }

    public UUID getId() { return id; }
    public String getTokenHash() { return tokenHash; }
    public UUID getClientId() { return clientId; }
    public UUID getUserId() { return userId; }
    public UUID getTenantId() { return tenantId; }
    public String getScope() { return scope; }
    public Instant getExpiresAt() { return expiresAt; }
    @Nullable public Instant getRevokedAt() { return revokedAt; }
    public Instant getCreatedAt() { return createdAt; }

    public boolean isValid() {
        return revokedAt == null && Instant.now().isBefore(expiresAt);
    }

    public void revoke() {
        this.revokedAt = Instant.now();
    }
}
