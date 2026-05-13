package co.pindraft.identity.domain;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;
import org.jspecify.annotations.NullMarked;
import org.jspecify.annotations.Nullable;

/**
 * A pending invitation for a person (by email) to join a tenant in a specific role.
 *
 * <p>The token is stored as a hash. The plaintext is returned exactly once at
 * creation, so the admin can copy the URL and forward it. After that, the token can
 * only be recognized by hashing the candidate at accept time and matching against
 * {@code token_hash}.
 */
@Entity
@Table(name = "tenant_invitations")
@NullMarked
public class TenantInvitationEntity {
    @Id
    @Column(name = "id", columnDefinition = "uuid")
    private UUID id;

    @Column(name = "tenant_id", columnDefinition = "uuid", nullable = false)
    private UUID tenantId;

    @Column(name = "email", nullable = false, length = 255)
    private String email;

    @Column(name = "role", nullable = false, length = 32)
    private String role;

    @Column(name = "token_hash", nullable = false, length = 255)
    private String tokenHash;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 32)
    private InvitationStatus status;

    @Column(name = "invited_by", columnDefinition = "uuid", nullable = false)
    private UUID invitedBy;

    @Column(name = "expires_at", nullable = false)
    private Instant expiresAt;

    @Column(name = "accepted_at") @Nullable
    private Instant acceptedAt;

    @Column(name = "accepted_user_id", columnDefinition = "uuid") @Nullable
    private UUID acceptedUserId;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    protected TenantInvitationEntity() {}

    public TenantInvitationEntity(UUID id, UUID tenantId, String email, String role,
                                  String tokenHash, UUID invitedBy, Instant expiresAt) {
        this.id = id;
        this.tenantId = tenantId;
        this.email = email;
        this.role = role;
        this.tokenHash = tokenHash;
        this.status = InvitationStatus.PENDING;
        this.invitedBy = invitedBy;
        this.expiresAt = expiresAt;
        this.createdAt = Instant.now();
    }

    public void markAccepted(UUID userId) {
        this.status = InvitationStatus.ACCEPTED;
        this.acceptedUserId = userId;
        this.acceptedAt = Instant.now();
    }

    public void markRevoked() { this.status = InvitationStatus.REVOKED; }
    public void markExpired() { this.status = InvitationStatus.EXPIRED; }

    public boolean isUsable(Instant now) {
        return status == InvitationStatus.PENDING && now.isBefore(expiresAt);
    }

    public UUID getId() { return id; }
    public UUID getTenantId() { return tenantId; }
    public String getEmail() { return email; }
    public String getRole() { return role; }
    public String getTokenHash() { return tokenHash; }
    public InvitationStatus getStatus() { return status; }
    public UUID getInvitedBy() { return invitedBy; }
    public Instant getExpiresAt() { return expiresAt; }
    @Nullable public Instant getAcceptedAt() { return acceptedAt; }
    @Nullable public UUID getAcceptedUserId() { return acceptedUserId; }
    public Instant getCreatedAt() { return createdAt; }
}
