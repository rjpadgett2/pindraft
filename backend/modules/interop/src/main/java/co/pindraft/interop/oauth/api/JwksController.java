package co.pindraft.interop.oauth.api;

import co.pindraft.interop.oauth.application.RsaKeyManager;
import co.pindraft.interop.oauth.domain.RsaKeyEntity;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.math.BigInteger;
import java.util.Base64;
import java.util.List;
import java.util.Map;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Exposes the platform's RSA public keys as a JWK Set per RFC 7517.
 *
 * <p>Clients fetch this once and cache it. Tokens carry the {@code kid} claim so a
 * verifier knows which key to use; including all (active and rotating-out) keys here
 * lets verifiers handle the rotation window gracefully.
 */
@RestController
@RequestMapping("/.well-known/jwks.json")
@Tag(name = "OAuth", description = "JWKS endpoint")
public class JwksController {

    private final RsaKeyManager keyManager;

    public JwksController(RsaKeyManager keyManager) {
        this.keyManager = keyManager;
    }

    @GetMapping
    @Operation(summary = "Public keys for JWT verification")
    public Map<String, Object> jwks() {
        return Map.of("keys", keyManager.allKeys().stream().map(JwksController::toJwk).toList());
    }

    private static Map<String, Object> toJwk(RsaKeyEntity key) {
        var pub = RsaKeyManager.decodePublic(key.getPublicKeyB64());
        var modulus = pub.getModulus();
        var exponent = pub.getPublicExponent();
        return Map.of(
            "kty", "RSA",
            "use", "sig",
            "alg", "RS256",
            "kid", key.getKeyId(),
            "n", base64UrlUnsignedBigInt(modulus),
            "e", base64UrlUnsignedBigInt(exponent)
        );
    }

    private static String base64UrlUnsignedBigInt(BigInteger n) {
        byte[] bytes = n.toByteArray();
        // BigInteger.toByteArray includes a leading sign byte; strip if present
        if (bytes.length > 1 && bytes[0] == 0) {
            byte[] stripped = new byte[bytes.length - 1];
            System.arraycopy(bytes, 1, stripped, 0, stripped.length);
            bytes = stripped;
        }
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }
}
