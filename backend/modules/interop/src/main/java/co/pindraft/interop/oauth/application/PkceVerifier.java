package co.pindraft.interop.oauth.application;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.Base64;
import org.springframework.stereotype.Component;

/**
 * RFC 7636 PKCE verification.
 *
 * <p>Client generates a {@code code_verifier} (43-128 char random string), derives a
 * {@code code_challenge} as Base64URL(SHA-256(verifier)), sends the challenge with
 * /authorize. On /token exchange, client presents the original verifier; we recompute
 * the challenge and constant-time compare.
 *
 * <p>{@code plain} method is permitted by RFC 7636 but actively disallowed here — only
 * {@code S256}. Plain provides no security beyond having the code itself; an attacker
 * who intercepts the redirect to capture the code can also capture the verifier in the
 * same response, since they're the same value.
 */
@Component
public class PkceVerifier {

    /** Verifies the supplied code_verifier matches the stored code_challenge. */
    public boolean verify(String storedChallenge, String storedMethod, String suppliedVerifier) {
        if (!"S256".equals(storedMethod)) {
            return false;  // we only ever issue codes with S256
        }
        if (suppliedVerifier == null || suppliedVerifier.length() < 43 || suppliedVerifier.length() > 128) {
            return false;
        }
        try {
            var digest = MessageDigest.getInstance("SHA-256")
                .digest(suppliedVerifier.getBytes(StandardCharsets.US_ASCII));
            var computed = Base64.getUrlEncoder().withoutPadding().encodeToString(digest);
            return constantTimeEquals(computed, storedChallenge);
        } catch (Exception e) {
            return false;
        }
    }

    private static boolean constantTimeEquals(String a, String b) {
        if (a == null || b == null || a.length() != b.length()) return false;
        int diff = 0;
        for (int i = 0; i < a.length(); i++) {
            diff |= a.charAt(i) ^ b.charAt(i);
        }
        return diff == 0;
    }
}
