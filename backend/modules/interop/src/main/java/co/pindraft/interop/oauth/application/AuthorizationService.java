package co.pindraft.interop.oauth.application;

import co.pindraft.interop.oauth.domain.AuthorizationCodeEntity;
import co.pindraft.interop.oauth.infrastructure.AuthorizationCodeRepository;
import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;
import java.util.Base64;
import java.util.Optional;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Manages authorization codes from the /authorize endpoint.
 *
 * <p>Codes are 32 bytes of randomness, Base64URL-encoded. 5-minute TTL. One-time use:
 * consumed at exchange. Re-presenting a consumed code returns empty (caller treats as
 * a possible breach signal).
 */
@Service
public class AuthorizationService {

    private static final SecureRandom RANDOM = new SecureRandom();
    private static final Duration CODE_TTL = Duration.ofMinutes(5);

    private final AuthorizationCodeRepository repo;

    public AuthorizationService(AuthorizationCodeRepository repo) {
        this.repo = repo;
    }

    @Transactional
    public AuthorizationCodeEntity issue(UUID clientId, UUID userId, UUID tenantId,
                                          String redirectUri, String codeChallenge,
                                          String codeChallengeMethod, String scope) {
        var bytes = new byte[32];
        RANDOM.nextBytes(bytes);
        var code = Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
        var entity = new AuthorizationCodeEntity(
            UUID.randomUUID(), code, clientId, userId, tenantId,
            redirectUri, codeChallenge, codeChallengeMethod, scope,
            Instant.now().plus(CODE_TTL));
        return repo.save(entity);
    }

    /**
     * Consume a code: verify it exists, isn't expired, hasn't been used before. If valid,
     * mark consumed and return it. Anything else returns empty.
     */
    @Transactional
    public Optional<AuthorizationCodeEntity> consume(String code) {
        var found = repo.findByCode(code);
        if (found.isEmpty()) return Optional.empty();
        var entity = found.get();
        if (entity.isExpired() || entity.isConsumed()) return Optional.empty();
        entity.consume();
        return Optional.of(repo.save(entity));
    }
}
