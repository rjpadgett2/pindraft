package co.pindraft.interop.oauth.domain;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;
import org.jspecify.annotations.NullMarked;

/**
 * Persistent RSA-2048 keypair for signing structured tokens (ID tokens) and exposing
 * the public key via JWKS. Stored as PKCS#8 (private) and X.509 (public) byte arrays,
 * Base64-encoded.
 *
 * <p>Rotation strategy (future): {@code activeForSigning} can be flipped to false on
 * old keys; both keys' public components remain in JWKS so verifiers can validate
 * tokens signed before rotation. Old keys age out after refresh-token TTL (90d).
 */
@Entity
@Table(name = "oauth_rsa_keys")
@NullMarked
public class RsaKeyEntity {
    @Id
    @Column(name = "id", columnDefinition = "uuid")
    private UUID id;

    @Column(name = "key_id", nullable = false, unique = true, length = 32)
    private String keyId;

    @Column(name = "public_key_b64", columnDefinition = "text", nullable = false)
    private String publicKeyB64;

    @Column(name = "private_key_b64", columnDefinition = "text", nullable = false)
    private String privateKeyB64;

    @Column(name = "active_for_signing", nullable = false)
    private boolean activeForSigning;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    protected RsaKeyEntity() {}

    public RsaKeyEntity(UUID id, String keyId, String publicKeyB64, String privateKeyB64) {
        this.id = id;
        this.keyId = keyId;
        this.publicKeyB64 = publicKeyB64;
        this.privateKeyB64 = privateKeyB64;
        this.activeForSigning = true;
        this.createdAt = Instant.now();
    }

    public UUID getId() { return id; }
    public String getKeyId() { return keyId; }
    public String getPublicKeyB64() { return publicKeyB64; }
    public String getPrivateKeyB64() { return privateKeyB64; }
    public boolean isActiveForSigning() { return activeForSigning; }
    public Instant getCreatedAt() { return createdAt; }
}
