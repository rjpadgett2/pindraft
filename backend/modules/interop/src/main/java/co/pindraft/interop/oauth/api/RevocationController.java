package co.pindraft.interop.oauth.api;

import co.pindraft.interop.oauth.application.OAuthClientService;
import co.pindraft.interop.oauth.application.TokenService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.UUID;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/**
 * RFC 7009 token revocation. Accepts an opaque token, revokes the corresponding access
 * or refresh entity. Returns 200 regardless of whether the token existed — RFC 7009 §2.2.
 */
@RestController
@RequestMapping("/api/v1/oauth/revoke")
@Tag(name = "OAuth", description = "Token revocation")
public class RevocationController {

    private final OAuthClientService clients;
    private final TokenService tokens;

    public RevocationController(OAuthClientService clients, TokenService tokens) {
        this.clients = clients;
        this.tokens = tokens;
    }

    @PostMapping(consumes = MediaType.APPLICATION_FORM_URLENCODED_VALUE)
    @Operation(summary = "Revoke an access or refresh token")
    public ResponseEntity<?> revoke(
        @RequestParam("token") String token,
        @RequestParam(value = "token_type_hint", required = false) String hint,
        @RequestParam("client_id") String clientIdStr,
        @RequestParam(value = "client_secret", required = false) String clientSecret
    ) {
        // Verify the client — only the issuing client (or one with valid creds) can revoke
        try {
            var clientId = UUID.fromString(clientIdStr);
            var client = clients.findActive(clientId).orElse(null);
            if (client == null) return ResponseEntity.badRequest().build();
            if (!client.isPkceRequired() || clientSecret != null) {
                if (clientSecret == null || !clients.verifySecret(client, clientSecret)) {
                    return ResponseEntity.badRequest().build();
                }
            }
        } catch (Exception e) {
            return ResponseEntity.badRequest().build();
        }

        // Try as access token first, then refresh — or vice versa based on hint
        if ("refresh_token".equals(hint)) {
            tokens.revokeRefreshToken(token);
            tokens.revokeAccessToken(token);  // also try access in case hint was wrong
        } else {
            tokens.revokeAccessToken(token);
            tokens.revokeRefreshToken(token);
        }
        return ResponseEntity.ok().build();
    }
}
