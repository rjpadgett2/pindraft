package co.pindraft.interop.oauth.application;

import co.pindraft.interop.oauth.domain.AccessTokenEntity;
import co.pindraft.interop.oauth.domain.OAuthRefreshTokenEntity;
import co.pindraft.interop.oauth.infrastructure.AccessTokenRepository;
import co.pindraft.interop.oauth.infrastructure.OAuthRefreshTokenRepository;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayDeque;
import java.util.Base64;
import java.util.HashSet;
import java.util.HexFormat;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import org.jspecify.annotations.Nullable;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class TokenService {

    private static final Logger log = LoggerFactory.getLogger(TokenService.class);

    public static final String ACCESS_PREFIX = "oat_";
    public static final String REFRESH_PREFIX = "ort_";
    public static final Duration ACCESS_TTL = Duration.ofHours(1);
    public static final Duration REFRESH_TTL = Duration.ofDays(90);

    private static final SecureRandom RANDOM = new SecureRandom();

    private final AccessTokenRepository accessTokens;
    private final OAuthRefreshTokenRepository refreshTokens;

    public TokenService(AccessTokenRepository accessTokens, OAuthRefreshTokenRepository refreshTokens) {
        this.accessTokens = accessTokens;
        this.refreshTokens = refreshTokens;
    }

    @Transactional
    public IssuedTokenPair issuePair(UUID clientId, UUID userId, UUID tenantId, String scope,
                                       @Nullable UUID rotatedFromRefreshId) {
        var accessPlain = ACCESS_PREFIX + randomTokenBody();
        var refreshPlain = REFRESH_PREFIX + randomTokenBody();
        var accessEntity = new AccessTokenEntity(
            UUID.randomUUID(), hash(accessPlain), clientId, userId, tenantId, scope,
            Instant.now().plus(ACCESS_TTL));
        var refreshEntity = new OAuthRefreshTokenEntity(
            UUID.randomUUID(), hash(refreshPlain), clientId, userId, tenantId, scope,
            Instant.now().plus(REFRESH_TTL), rotatedFromRefreshId);
        accessTokens.save(accessEntity);
        refreshTokens.save(refreshEntity);
        return new IssuedTokenPair(accessPlain, refreshPlain, accessEntity);
    }

    public Optional<AccessTokenEntity> resolveAccessToken(String plaintext) {
        if (plaintext == null || !plaintext.startsWith(ACCESS_PREFIX)) return Optional.empty();
        return accessTokens.findByTokenHash(hash(plaintext)).filter(AccessTokenEntity::isValid);
    }

    public Optional<OAuthRefreshTokenEntity> resolveRefreshToken(String plaintext) {
        if (plaintext == null || !plaintext.startsWith(REFRESH_PREFIX)) return Optional.empty();
        return refreshTokens.findByTokenHash(hash(plaintext));
    }

    @Transactional
    public void revokeAccessToken(String plaintext) {
        accessTokens.findByTokenHash(hash(plaintext)).ifPresent(t -> {
            t.revoke();
            accessTokens.save(t);
        });
    }

    @Transactional
    public void revokeRefreshToken(String plaintext) {
        refreshTokens.findByTokenHash(hash(plaintext)).ifPresent(t -> {
            t.revoke();
            refreshTokens.save(t);
        });
    }

    @Transactional
    public void markRefreshUsed(OAuthRefreshTokenEntity rt) {
        rt.markUsed();
        refreshTokens.save(rt);
    }

    /**
     * Reuse-detection chain revocation. When a refresh token that's already been used
     * is presented again, walk the rotation lineage and revoke everything in it, plus
     * every active access token for the same (client, user, tenant) tuple.
     */
    @Transactional
    public void revokeChainForReusedToken(OAuthRefreshTokenEntity reusedRefresh) {
        log.warn("Refresh token reuse detected for client={}, user={}, tenant={} — revoking chain",
            reusedRefresh.getClientId(), reusedRefresh.getUserId(), reusedRefresh.getTenantId());

        for (var id : walkChain(reusedRefresh)) {
            refreshTokens.findById(id).ifPresent(token -> {
                if (token.getRevokedAt() == null) {
                    token.revoke();
                    refreshTokens.save(token);
                }
            });
        }

        var activeAccessTokens = accessTokens.findByClientIdAndUserIdAndTenantIdAndRevokedAtIsNull(
            reusedRefresh.getClientId(), reusedRefresh.getUserId(), reusedRefresh.getTenantId());
        for (var at : activeAccessTokens) {
            at.revoke();
            accessTokens.save(at);
        }
    }

    private Set<UUID> walkChain(OAuthRefreshTokenEntity start) {
        var visited = new HashSet<UUID>();
        var queue = new ArrayDeque<OAuthRefreshTokenEntity>();
        queue.add(start);
        while (!queue.isEmpty()) {
            var current = queue.poll();
            if (!visited.add(current.getId())) continue;
            if (current.getRotatedFrom() != null) {
                refreshTokens.findById(current.getRotatedFrom()).ifPresent(queue::add);
            }
            queue.addAll(refreshTokens.findByRotatedFrom(current.getId()));
        }
        return visited;
    }

    private static String randomTokenBody() {
        var bytes = new byte[32];
        RANDOM.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    static String hash(String plaintext) {
        try {
            var digest = MessageDigest.getInstance("SHA-256")
                .digest(plaintext.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(digest);
        } catch (Exception e) {
            throw new IllegalStateException("SHA-256 unavailable", e);
        }
    }

    public record IssuedTokenPair(String accessToken, String refreshToken, AccessTokenEntity entity) {}
}
