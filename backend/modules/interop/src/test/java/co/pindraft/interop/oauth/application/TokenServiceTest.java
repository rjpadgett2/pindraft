package co.pindraft.interop.oauth.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

import co.pindraft.interop.oauth.domain.AccessTokenEntity;
import co.pindraft.interop.oauth.domain.OAuthRefreshTokenEntity;
import co.pindraft.interop.oauth.infrastructure.AccessTokenRepository;
import co.pindraft.interop.oauth.infrastructure.OAuthRefreshTokenRepository;
import java.time.Instant;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class TokenServiceTest {

    @Mock private AccessTokenRepository accessTokens;
    @Mock private OAuthRefreshTokenRepository refreshTokens;
    private TokenService service;

    @BeforeEach
    void setUp() {
        service = new TokenService(accessTokens, refreshTokens);
    }

    @Test
    void issue_pair_returns_oat_and_ort_prefixed_tokens() {
        when(accessTokens.save(any(AccessTokenEntity.class))).thenAnswer(inv -> inv.getArgument(0));
        when(refreshTokens.save(any(OAuthRefreshTokenEntity.class))).thenAnswer(inv -> inv.getArgument(0));

        var pair = service.issuePair(
            UUID.randomUUID(), UUID.randomUUID(), UUID.randomUUID(),
            "mill:foo:interop", null);

        assertThat(pair.accessToken()).startsWith("oat_");
        assertThat(pair.refreshToken()).startsWith("ort_");
    }

    @Test
    void resolve_access_token_returns_entity_when_valid() {
        var clientId = UUID.randomUUID();
        var userId = UUID.randomUUID();
        var tenantId = UUID.randomUUID();
        var tokenPlain = "oat_test123";
        var entity = new AccessTokenEntity(
            UUID.randomUUID(), TokenService.hash(tokenPlain), clientId, userId, tenantId,
            "scope", Instant.now().plusSeconds(3600));
        when(accessTokens.findByTokenHash(TokenService.hash(tokenPlain)))
            .thenReturn(Optional.of(entity));

        var resolved = service.resolveAccessToken(tokenPlain);

        assertThat(resolved).isPresent();
        assertThat(resolved.get().getUserId()).isEqualTo(userId);
    }

    @Test
    void resolve_access_token_returns_empty_for_wrong_prefix() {
        var resolved = service.resolveAccessToken("pdt_old-style-token");
        assertThat(resolved).isEmpty();
    }

    @Test
    void resolve_access_token_returns_empty_for_expired_token() {
        var tokenPlain = "oat_expired123";
        var entity = new AccessTokenEntity(
            UUID.randomUUID(), TokenService.hash(tokenPlain),
            UUID.randomUUID(), UUID.randomUUID(), UUID.randomUUID(),
            "scope", Instant.now().minusSeconds(60));  // expired
        when(accessTokens.findByTokenHash(TokenService.hash(tokenPlain)))
            .thenReturn(Optional.of(entity));

        assertThat(service.resolveAccessToken(tokenPlain)).isEmpty();
    }
}
