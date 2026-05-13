package co.pindraft.interop.oauth.api;

import co.pindraft.interop.oauth.application.AuthorizationService;
import co.pindraft.interop.oauth.application.OAuthClientService;
import co.pindraft.interop.oauth.application.PkceVerifier;
import co.pindraft.interop.oauth.application.TokenService;
import co.pindraft.interop.oauth.application.TokenService.IssuedTokenPair;
import co.pindraft.interop.oauth.domain.OAuthRefreshTokenEntity;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/**
 * The OAuth /token endpoint. Handles two grant types: authorization_code and refresh_token.
 *
 * <p>Refresh handling implements reuse detection. If a refresh token presented for
 * exchange has already been {@code used_at}, it's a strong signal the token was
 * compromised (the legitimate holder rotated it, now the attacker is replaying — or
 * vice versa). We revoke the entire rotation chain and return invalid_grant.
 */
@RestController
@RequestMapping("/api/v1/oauth/token")
@Tag(name = "OAuth", description = "Token endpoint")
public class TokenController {

    private final OAuthClientService clients;
    private final AuthorizationService authorizations;
    private final TokenService tokens;
    private final PkceVerifier pkceVerifier;

    public TokenController(
        OAuthClientService clients,
        AuthorizationService authorizations,
        TokenService tokens,
        PkceVerifier pkceVerifier
    ) {
        this.clients = clients;
        this.authorizations = authorizations;
        this.tokens = tokens;
        this.pkceVerifier = pkceVerifier;
    }

    @PostMapping(consumes = MediaType.APPLICATION_FORM_URLENCODED_VALUE)
    @Operation(summary = "Exchange authorization code or refresh token for an access token")
    public ResponseEntity<?> token(
        @RequestParam("grant_type") String grantType,
        @RequestParam(value = "code", required = false) String code,
        @RequestParam(value = "redirect_uri", required = false) String redirectUri,
        @RequestParam(value = "code_verifier", required = false) String codeVerifier,
        @RequestParam(value = "refresh_token", required = false) String refreshTokenParam,
        @RequestParam("client_id") String clientIdStr,
        @RequestParam(value = "client_secret", required = false) String clientSecret
    ) {
        return switch (grantType) {
            case "authorization_code" ->
                handleAuthCode(clientIdStr, clientSecret, code, redirectUri, codeVerifier);
            case "refresh_token" ->
                handleRefresh(clientIdStr, clientSecret, refreshTokenParam);
            default ->
                tokenError("unsupported_grant_type");
        };
    }

    private ResponseEntity<?> handleAuthCode(String clientIdStr, String clientSecret,
                                              String code, String redirectUri, String codeVerifier) {
        UUID clientId;
        try { clientId = UUID.fromString(clientIdStr); }
        catch (Exception e) { return tokenError("invalid_client"); }

        var client = clients.findActive(clientId).orElse(null);
        if (client == null) return tokenError("invalid_client");
        if (!client.isPkceRequired() || clientSecret != null) {
            if (clientSecret == null || !clients.verifySecret(client, clientSecret)) {
                return tokenError("invalid_client");
            }
        }

        if (code == null || redirectUri == null || codeVerifier == null) {
            return tokenError("invalid_request");
        }

        var authCode = authorizations.consume(code).orElse(null);
        if (authCode == null) return tokenError("invalid_grant");
        if (!authCode.getClientId().equals(clientId)) return tokenError("invalid_grant");
        if (!authCode.getRedirectUri().equals(redirectUri)) return tokenError("invalid_grant");
        if (!pkceVerifier.verify(authCode.getCodeChallenge(), authCode.getCodeChallengeMethod(), codeVerifier)) {
            return tokenError("invalid_grant", "PKCE verification failed");
        }

        var pair = tokens.issuePair(
            clientId, authCode.getUserId(), authCode.getTenantId(), authCode.getScope(), null);
        return ResponseEntity.ok(toResponse(pair, authCode.getScope()));
    }

    private ResponseEntity<?> handleRefresh(String clientIdStr, String clientSecret, String refreshTokenParam) {
        UUID clientId;
        try { clientId = UUID.fromString(clientIdStr); }
        catch (Exception e) { return tokenError("invalid_client"); }

        var client = clients.findActive(clientId).orElse(null);
        if (client == null) return tokenError("invalid_client");
        if (!client.isPkceRequired() || clientSecret != null) {
            if (clientSecret == null || !clients.verifySecret(client, clientSecret)) {
                return tokenError("invalid_client");
            }
        }

        if (refreshTokenParam == null) return tokenError("invalid_request");

        var existing = tokens.resolveRefreshToken(refreshTokenParam).orElse(null);
        if (existing == null) return tokenError("invalid_grant");

        // Reuse detection: this token has already been rotated. The token was either
        // captured by an attacker OR the legitimate user reused it (bug). Either way,
        // we can't safely issue new tokens — revoke the whole chain.
        if (existing.getUsedAt() != null) {
            tokens.revokeChainForReusedToken(existing);
            return tokenError("invalid_grant", "refresh token reuse detected");
        }

        if (existing.getRevokedAt() != null) return tokenError("invalid_grant");
        if (!existing.isValid()) return tokenError("invalid_grant");
        if (!existing.getClientId().equals(clientId)) return tokenError("invalid_grant");

        tokens.markRefreshUsed(existing);
        var pair = tokens.issuePair(
            clientId, existing.getUserId(), existing.getTenantId(),
            existing.getScope(), existing.getId());
        return ResponseEntity.ok(toResponse(pair, existing.getScope()));
    }

    private static ResponseEntity<?> tokenError(String code) {
        return tokenError(code, null);
    }

    private static ResponseEntity<?> tokenError(String code, String description) {
        var body = new ErrorResponse(code, description);
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(body);
    }

    private static TokenResponse toResponse(IssuedTokenPair pair, String scope) {
        return new TokenResponse(
            pair.accessToken(), "Bearer",
            (int) TokenService.ACCESS_TTL.toSeconds(),
            pair.refreshToken(), scope);
    }

    public record TokenResponse(
        String access_token, String token_type, int expires_in,
        String refresh_token, String scope) {}

    public record ErrorResponse(String error, String error_description) {}
}
