package co.pindraft.interop.oauth.application;

import co.pindraft.interop.oauth.domain.RsaKeyEntity;
import co.pindraft.interop.oauth.infrastructure.RsaKeyRepository;
import jakarta.annotation.PostConstruct;
import java.security.KeyFactory;
import java.security.KeyPair;
import java.security.KeyPairGenerator;
import java.security.PrivateKey;
import java.security.PublicKey;
import java.security.interfaces.RSAPublicKey;
import java.security.spec.PKCS8EncodedKeySpec;
import java.security.spec.X509EncodedKeySpec;
import java.util.Base64;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * Manages the RSA keypair used for signing structured JWTs and exposing the public
 * key set at {@code /.well-known/jwks.json}.
 *
 * <p>On first start the app bootstraps a fresh keypair if none exists. Keys are
 * persisted so the same signing identity survives restarts — clients can cache JWKS
 * for hours/days without re-fetching on every deploy.
 *
 * <p>Rotation (future): generate a new keypair, mark it active for signing, leave the
 * old one in JWKS until existing tokens expire. We deliberately don't implement that
 * here; one keypair is sufficient until there's an operational rotation event.
 */
@Component
public class RsaKeyManager {

    private final RsaKeyRepository repo;

    public RsaKeyManager(RsaKeyRepository repo) {
        this.repo = repo;
    }

    @PostConstruct
    @Transactional
    public void bootstrapIfNeeded() {
        if (repo.findFirstByActiveForSigningTrueOrderByCreatedAtDesc().isPresent()) return;
        generateAndStore();
    }

    @Transactional
    public RsaKeyEntity generateAndStore() {
        try {
            var generator = KeyPairGenerator.getInstance("RSA");
            generator.initialize(2048);
            KeyPair pair = generator.generateKeyPair();
            var publicB64 = Base64.getEncoder().encodeToString(pair.getPublic().getEncoded());
            var privateB64 = Base64.getEncoder().encodeToString(pair.getPrivate().getEncoded());
            var keyId = "pdk_" + UUID.randomUUID().toString().substring(0, 12);
            var entity = new RsaKeyEntity(UUID.randomUUID(), keyId, publicB64, privateB64);
            return repo.save(entity);
        } catch (Exception e) {
            throw new IllegalStateException("Failed to generate RSA keypair", e);
        }
    }

    public RsaKeyEntity activeSigningKey() {
        return repo.findFirstByActiveForSigningTrueOrderByCreatedAtDesc()
            .orElseThrow(() -> new IllegalStateException("No active signing key — bootstrap failed?"));
    }

    public List<RsaKeyEntity> allKeys() {
        return repo.findAllByOrderByCreatedAtDesc();
    }

    /** Decode a public key from its Base64-encoded X.509 SubjectPublicKeyInfo form. */
    public static RSAPublicKey decodePublic(String publicKeyB64) {
        try {
            var bytes = Base64.getDecoder().decode(publicKeyB64);
            var keySpec = new X509EncodedKeySpec(bytes);
            return (RSAPublicKey) KeyFactory.getInstance("RSA").generatePublic(keySpec);
        } catch (Exception e) {
            throw new IllegalStateException("Failed to decode public key", e);
        }
    }

    /** Decode the private key for signing. */
    public static PrivateKey decodePrivate(String privateKeyB64) {
        try {
            var bytes = Base64.getDecoder().decode(privateKeyB64);
            var keySpec = new PKCS8EncodedKeySpec(bytes);
            return KeyFactory.getInstance("RSA").generatePrivate(keySpec);
        } catch (Exception e) {
            throw new IllegalStateException("Failed to decode private key", e);
        }
    }
}
