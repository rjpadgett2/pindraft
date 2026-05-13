package co.pindraft.interop.oauth.api;

import co.pindraft.common.security.TenantContextHolder;
import co.pindraft.interop.oauth.application.AuthorizationService;
import co.pindraft.interop.oauth.application.OAuthClientService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/**
 * The OAuth /authorize endpoint (RFC 6749 §4.1.1).
 *
 * <p>Behavior: validate the request, then 302 to {@code consentUrlBase} with the grant
 * parameters in the query string. The customer-portal renders the consent UI there.
 * On approval it POSTs back to {@code /approve}, which issues the authorization code
 * and returns the final redirect URL to the client.
 *
 * <p>The consent URL base is read from {@code pindraft.interop.consent-url-base}.
 * Production points it at https://portal.pindraft.co/oauth/consent.
 */
@RestController
@RequestMapping("/api/v1/oauth/authorize")
@Tag(name = "OAuth", description = "Authorization endpoint")
public class AuthorizationController {

    private final OAuthClientService clients;
    private final AuthorizationService authorizations;
    private final TenantContextHolder contextHolder;
    private final String consentUrlBase;

    public AuthorizationController(
        OAuthClientService clients,
        AuthorizationService authorizations,
        TenantContextHolder contextHolder,
        @Value("${pindraft.interop.consent-url-base}") String consentUrlBase
    ) {
        this.clients = clients;
        this.authorizations = authorizations;
        this.contextHolder = contextHolder;
        this.consentUrlBase = consentUrlBase;
    }

    @GetMapping
    @Operation(summary = "OAuth authorization endpoint — initiates the grant flow")
    public ResponseEntity<?> authorize(
        @RequestParam("response_type") String responseType,
        @RequestParam("client_id") String clientIdStr,
        @RequestParam("redirect_uri") String redirectUri,
        @RequestParam("scope") String scope,
        @RequestParam("state") String state,
        @RequestParam("code_challenge") String codeChallenge,
        @RequestParam(value = "code_challenge_method", defaultValue = "S256") String codeChallengeMethod
    ) {
        UUID clientId;
        try { clientId = UUID.fromString(clientIdStr); }
        catch (Exception e) { return ResponseEntity.badRequest().body("invalid_client"); }

        var client = clients.findActive(clientId).orElse(null);
        if (client == null) return ResponseEntity.badRequest().body("invalid_client");
        if (!clients.isRedirectUriAllowed(client, redirectUri)) {
            return ResponseEntity.badRequest().body("invalid_redirect_uri");
        }

        // Beyond this point, errors redirect back to the client per RFC 6749 §4.1.2.1
        if (!"code".equals(responseType)) {
            return redirectWithError(redirectUri, state, "unsupported_response_type", null);
        }
        if (!"S256".equals(codeChallengeMethod)) {
            return redirectWithError(redirectUri, state, "invalid_request",
                "only S256 code_challenge_method is supported");
        }
        if (codeChallenge == null || codeChallenge.isBlank()) {
            return redirectWithError(redirectUri, state, "invalid_request", "code_challenge required");
        }

        var consentUrl = buildConsentUrl(clientIdStr, redirectUri, scope, state,
            codeChallenge, codeChallengeMethod, client.getName(), client.getTenantId().toString());
        return ResponseEntity.status(HttpStatus.FOUND).header("Location", consentUrl).build();
    }

    @PostMapping("/approve")
    @Operation(summary = "Approve the authorization request and issue a code")
    public ResponseEntity<?> approve(@RequestBody ApprovalRequest req) {
        UUID clientId;
        try { clientId = UUID.fromString(req.clientId()); }
        catch (Exception e) { return ResponseEntity.badRequest().body("invalid_client"); }

        var client = clients.findActive(clientId).orElse(null);
        if (client == null) return ResponseEntity.badRequest().body("invalid_client");
        if (!clients.isRedirectUriAllowed(client, req.redirectUri())) {
            return ResponseEntity.badRequest().body("invalid_redirect_uri");
        }

        var userId = contextHolder.get().userId();
        if (userId == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();

        var authCode = authorizations.issue(
            clientId, userId, client.getTenantId(),
            req.redirectUri(), req.codeChallenge(), req.codeChallengeMethod(), req.scope());

        var location = req.redirectUri() + (req.redirectUri().contains("?") ? "&" : "?")
            + "code=" + urlEnc(authCode.getCode())
            + "&state=" + urlEnc(req.state());
        return ResponseEntity.ok(new ApprovalResponse(location));
    }

    private static ResponseEntity<?> redirectWithError(
        String redirectUri, String state, String code, String description
    ) {
        var loc = redirectUri + (redirectUri.contains("?") ? "&" : "?")
            + "error=" + urlEnc(code) + "&state=" + urlEnc(state);
        if (description != null) loc += "&error_description=" + urlEnc(description);
        return ResponseEntity.status(HttpStatus.FOUND).header("Location", loc).build();
    }

    private String buildConsentUrl(
        String clientIdStr, String redirectUri, String scope, String state,
        String codeChallenge, String codeChallengeMethod, String clientName, String tenantId
    ) {
        return consentUrlBase
            + "?client_id=" + urlEnc(clientIdStr)
            + "&client_name=" + urlEnc(clientName)
            + "&tenant_id=" + urlEnc(tenantId)
            + "&redirect_uri=" + urlEnc(redirectUri)
            + "&scope=" + urlEnc(scope)
            + "&state=" + urlEnc(state)
            + "&code_challenge=" + urlEnc(codeChallenge)
            + "&code_challenge_method=" + urlEnc(codeChallengeMethod);
    }

    private static String urlEnc(String s) {
        return URLEncoder.encode(s == null ? "" : s, StandardCharsets.UTF_8);
    }

    public record ApprovalRequest(
        String clientId, String redirectUri, String scope, String state,
        String codeChallenge, String codeChallengeMethod) {}

    public record ApprovalResponse(String location) {}
}
