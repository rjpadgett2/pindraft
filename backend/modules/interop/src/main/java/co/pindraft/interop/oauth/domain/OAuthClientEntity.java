package co.pindraft.interop.oauth.domain;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import org.jspecify.annotations.NullMarked;

/**
 * A registered OAuth client. One per integration partner per tenant — Hirsel registers
 * once per mill it integrates with, getting its own client_id + secret for that pairing.
 *
 * <p>{@code redirectUrisJson} is a JSONB array of allowed redirect URIs. The authorize
 * endpoint validates the requested redirect_uri matches one of these exactly (RFC 6749
 * Section 3.1.2.2 strict matching, no partial matching of paths or query strings).
 *
 * <p>{@code pkceRequired} is true for public clients (mobile, SPA) — they can't safely
 * store a client secret so PKCE is the only proof. For confidential clients it can be
 * optional, though we recommend always-on PKCE per OAuth 2.1.
 */
@Entity
@Table(name = "oauth_clients")
@NullMarked
public class OAuthClientEntity {
    @Id
    @Column(name = "id", columnDefinition = "uuid")
    private UUID id;

    @Column(name = "tenant_id", columnDefinition = "uuid", nullable = false)
    private UUID tenantId;

    @Column(name = "name", nullable = false)
    private String name;

    @Column(name = "client_secret_hash", nullable = false)
    private String clientSecretHash;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "redirect_uris", columnDefinition = "jsonb", nullable = false)
    private String redirectUrisJson;

    @Column(name = "pkce_required", nullable = false)
    private boolean pkceRequired;

    @Column(name = "is_active", nullable = false)
    private boolean active;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    protected OAuthClientEntity() {}

    public OAuthClientEntity(UUID id, UUID tenantId, String name, String clientSecretHash,
                              String redirectUrisJson, boolean pkceRequired) {
        this.id = id;
        this.tenantId = tenantId;
        this.name = name;
        this.clientSecretHash = clientSecretHash;
        this.redirectUrisJson = redirectUrisJson;
        this.pkceRequired = pkceRequired;
        this.active = true;
        this.createdAt = Instant.now();
    }

    public UUID getId() { return id; }
    public UUID getTenantId() { return tenantId; }
    public String getName() { return name; }
    public String getClientSecretHash() { return clientSecretHash; }
    public String getRedirectUrisJson() { return redirectUrisJson; }
    public boolean isPkceRequired() { return pkceRequired; }
    public boolean isActive() { return active; }
    public Instant getCreatedAt() { return createdAt; }

    public void deactivate() { this.active = false; }
}
