package co.pindraft.interop.oauth.application;

import static org.assertj.core.api.Assertions.assertThat;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.Base64;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class PkceVerifierTest {

    private PkceVerifier verifier;

    @BeforeEach
    void setUp() {
        verifier = new PkceVerifier();
    }

    @Test
    void verifies_valid_s256_challenge_and_verifier_pair() throws Exception {
        var verifierStr = "dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk";
        var challenge = computeChallenge(verifierStr);
        assertThat(verifier.verify(challenge, "S256", verifierStr)).isTrue();
    }

    @Test
    void rejects_mismatched_verifier() throws Exception {
        var realVerifier = "dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk";
        var challenge = computeChallenge(realVerifier);
        assertThat(verifier.verify(challenge, "S256", "wrongverifierwrongverifierwrongverifier12345")).isFalse();
    }

    @Test
    void rejects_plain_method() {
        assertThat(verifier.verify("anything", "plain", "anything")).isFalse();
    }

    @Test
    void rejects_too_short_verifier() {
        assertThat(verifier.verify("c", "S256", "too-short")).isFalse();
    }

    private static String computeChallenge(String verifierStr) throws Exception {
        var digest = MessageDigest.getInstance("SHA-256")
            .digest(verifierStr.getBytes(StandardCharsets.US_ASCII));
        return Base64.getUrlEncoder().withoutPadding().encodeToString(digest);
    }
}
