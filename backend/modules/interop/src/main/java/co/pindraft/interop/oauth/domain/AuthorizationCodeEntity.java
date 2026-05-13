package co.pindraft.interop.oauth.domain;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;
import org.jspecify.annotations.NullMarked;

/**
 * A one-time-use authorization code from the /authorize endpoint. Bound to:
 *
 * <ul>
 *   <li>{@code clientId}: the OAuth client that requested it</li>
 *   <li>{@code userId}: the user who granted consent</li>
 *   <li>{@code tenantId}: the mill scope of the grant</li>
 *   <li>{@code codeChallenge} + {@code codeChallengeMethod}: PKCE binding</li>
 *   <li>{@code redirectUri}: the exact URI the code was issued for (RFC 6749 §4.1.3)</li>
 * </ul>
 *
 * <p>Expires after 5 minutes. Marked {@code consumedAt} on first use — replays of the
 * same code fail. If a consumed code is presented again, the grant is suspect; production
 * systems would revoke all tokens issued from it, though that's out of scope here.
 */
@Entity
@Table(name = "oauth_authorization_codes")
@NullMarked
public class AuthorizationCodeEntity {
    @Id
    @Column(name = "id", columnDefinition = "uuid")
    private UUID id;

    @Column(name = "code", nullable = false, unique = true, length = 64)
    private String code;

    @Column(name = "client_id", columnDefinition = "uuid", nullable = false)
    private UUID clientId;

    @Column(name = "user_id", columnDefinition = "uuid", nullable = false)
    private UUID userId;

    @Column(name = "tenant_id", columnDefinition = "uuid", nullable = false)
    private UUID tenantId;

    @Column(name = "redirect_uri", nullable = false)
    private String redirectUri;

    @Column(name = "code_challenge", nullable = false, length = 128)
    private String codeChallenge;

    @Column(name = "code_challenge_method", nullable = false, length = 8)
    private String codeChallengeMethod;

    @Column(name = "scope", nullable = false)
    private String scope;

    @Column(name = "expires_at", nullable = false)
    private Instant expiresAt;

    @Column(name = "consumed_at")
    private Instant consumedAt;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    protected AuthorizationCodeEntity() {}

    public AuthorizationCodeEntity(
        UUID id, String code, UUID clientId, UUID userId, UUID tenantId,
        String redirectUri, String codeChallenge, String codeChallengeMethod,
        String scope, Instant expiresAt
    ) {
        this.id = id;
        this.code = code;
        this.clientId = clientId;
        this.userId = userId;
        this.tenantId = tenantId;
        this.redirectUri = redirectUri;
        this.codeChallenge = codeChallenge;
        this.codeChallengeMethod = codeChallengeMethod;
        this.scope = scope;
        this.expiresAt = expiresAt;
        this.createdAt = Instant.now();
    }

    public UUID getId() { return id; }
    public String getCode() { return code; }
    public UUID getClientId() { return clientId; }
    public UUID getUserId() { return userId; }
    public UUID getTenantId() { return tenantId; }
    public String getRedirectUri() { return redirectUri; }
    public String getCodeChallenge() { return codeChallenge; }
    public String getCodeChallengeMethod() { return codeChallengeMethod; }
    public String getScope() { return scope; }
    public Instant getExpiresAt() { return expiresAt; }
    public Instant getConsumedAt() { return consumedAt; }
    public Instant getCreatedAt() { return createdAt; }

    public boolean isExpired() {
        return Instant.now().isAfter(expiresAt);
    }

    public boolean isConsumed() {
        return consumedAt != null;
    }

    public void consume() {
        this.consumedAt = Instant.now();
    }
}
