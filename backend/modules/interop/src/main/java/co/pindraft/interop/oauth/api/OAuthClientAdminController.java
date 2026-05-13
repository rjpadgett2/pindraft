package co.pindraft.interop.oauth.api;

import co.pindraft.common.security.TenantAccessGuard;
import co.pindraft.interop.oauth.application.OAuthClientService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

/**
 * Tenant-side admin for OAuth clients. Mill admins register partners (Hirsel etc.)
 * here, getting back a client_id + client_secret to give to the partner.
 *
 * <p>The plaintext secret is returned only on registration — there's no way to read
 * it again. Lost it? Re-register.
 */
@RestController
@RequestMapping("/api/v1/tenants/{tenantId}/oauth-clients")
@Tag(name = "OAuth Admin", description = "OAuth client registration for partners")
public class OAuthClientAdminController {

    private final OAuthClientService service;
    private final TenantAccessGuard accessGuard;

    public OAuthClientAdminController(OAuthClientService service, TenantAccessGuard accessGuard) {
        this.service = service;
        this.accessGuard = accessGuard;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Register a new OAuth client; secret returned in response only")
    public RegisteredResponse register(@PathVariable UUID tenantId, @Valid @RequestBody CreateRequest req) {
        accessGuard.requireRole(tenantId, "MILL_ADMIN");
        var result = service.register(tenantId, req.name(), req.redirectUris(), req.pkceRequired());
        return new RegisteredResponse(
            result.client().getId(), result.client().getName(),
            result.plainSecret(), result.client().isPkceRequired(),
            result.client().getCreatedAt());
    }

    public record CreateRequest(
        @NotBlank String name,
        @NotEmpty List<String> redirectUris,
        boolean pkceRequired) {}

    public record RegisteredResponse(
        UUID clientId, String name, String clientSecret,
        boolean pkceRequired, Instant createdAt) {}
}
