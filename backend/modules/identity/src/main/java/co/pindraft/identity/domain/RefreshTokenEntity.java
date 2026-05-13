package co.pindraft.identity.domain;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;
import org.jspecify.annotations.NullMarked;
import org.jspecify.annotations.Nullable;

@Entity
@Table(name = "refresh_tokens")
@NullMarked
public class RefreshTokenEntity {
    @Id
    @Column(name = "id", columnDefinition = "uuid")
    private UUID id;

    @Column(name = "user_id", columnDefinition = "uuid", nullable = false)
    private UUID userId;

    @Column(name = "token_hash", nullable = false, unique = true)
    private String tokenHash;

    @Column(name = "expires_at", nullable = false)
    private Instant expiresAt;

    @Column(name = "revoked", nullable = false)
    private boolean revoked;

    @Column(name = "rotated_to", columnDefinition = "uuid") @Nullable
    private UUID rotatedTo;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    protected RefreshTokenEntity() {}

    public RefreshTokenEntity(UUID id, UUID userId, String tokenHash, Instant expiresAt) {
        this.id = id;
        this.userId = userId;
        this.tokenHash = tokenHash;
        this.expiresAt = expiresAt;
        this.revoked = false;
        this.createdAt = Instant.now();
    }

    public UUID getId() { return id; }
    public UUID getUserId() { return userId; }
    public String getTokenHash() { return tokenHash; }
    public Instant getExpiresAt() { return expiresAt; }
    public boolean isRevoked() { return revoked; }
    @Nullable public UUID getRotatedTo() { return rotatedTo; }
    public Instant getCreatedAt() { return createdAt; }

    public void revoke() { this.revoked = true; }
    public void rotateTo(UUID newTokenId) {
        this.revoked = true;
        this.rotatedTo = newTokenId;
    }

    public boolean isValid() {
        return !revoked && Instant.now().isBefore(expiresAt);
    }
}
