package co.pindraft.interop.oauth.domain;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;
import org.jspecify.annotations.NullMarked;
import org.jspecify.annotations.Nullable;

/**
 * A refresh token, used to obtain a fresh access token without re-authenticating the
 * user. Single-use rotation: using a refresh token invalidates it and issues a new one
 * along with the new access token. If a refresh token is used twice, the entire chain
 * is treated as compromised — production systems revoke all tokens in the chain.
 *
 * <p>90-day TTL. Hashed at rest, same as access tokens.
 */
@Entity
@Table(name = "oauth_refresh_tokens")
@NullMarked
public class OAuthRefreshTokenEntity {
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

    @Column(name = "used_at") @Nullable
    private Instant usedAt;

    @Column(name = "revoked_at") @Nullable
    private Instant revokedAt;

    @Column(name = "rotated_from", columnDefinition = "uuid") @Nullable
    private UUID rotatedFrom;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    protected OAuthRefreshTokenEntity() {}

    public OAuthRefreshTokenEntity(UUID id, String tokenHash, UUID clientId, UUID userId,
                                UUID tenantId, String scope, Instant expiresAt,
                                @Nullable UUID rotatedFrom) {
        this.id = id;
        this.tokenHash = tokenHash;
        this.clientId = clientId;
        this.userId = userId;
        this.tenantId = tenantId;
        this.scope = scope;
        this.expiresAt = expiresAt;
        this.rotatedFrom = rotatedFrom;
        this.createdAt = Instant.now();
    }

    public UUID getId() { return id; }
    public String getTokenHash() { return tokenHash; }
    public UUID getClientId() { return clientId; }
    public UUID getUserId() { return userId; }
    public UUID getTenantId() { return tenantId; }
    public String getScope() { return scope; }
    public Instant getExpiresAt() { return expiresAt; }
    @Nullable public Instant getUsedAt() { return usedAt; }
    @Nullable public Instant getRevokedAt() { return revokedAt; }
    @Nullable public UUID getRotatedFrom() { return rotatedFrom; }
    public Instant getCreatedAt() { return createdAt; }

    public boolean isValid() {
        return usedAt == null && revokedAt == null && Instant.now().isBefore(expiresAt);
    }

    public void markUsed() {
        this.usedAt = Instant.now();
    }

    public void revoke() {
        this.revokedAt = Instant.now();
    }
}
