package co.pindraft.interop.security;

import co.pindraft.common.security.TenantContext;
import co.pindraft.common.security.TenantContext.TenantMembership;
import co.pindraft.common.security.TenantContextHolder;
import co.pindraft.interop.infrastructure.InteropClientRepository;
import co.pindraft.interop.oauth.application.TokenService;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpHeaders;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

/**
 * Auth filter for {@code /api/v1/interop/**}. Handles two token formats:
 *
 * <ul>
 *   <li>{@code Bearer pdt_<client-id>_<secret>} — v1 bearer scheme. Maintained for
 *       backwards compatibility while v1 clients migrate.</li>
 *   <li>{@code Bearer oat_<random>} — OAuth 2.1 opaque access token. Looked up in
 *       {@code oauth_access_tokens}, scoped to (tenant, user) pair.</li>
 * </ul>
 *
 * <p>Either path installs a TenantContext with the resolved tenant_id. The v1 path has
 * no user_id since v1 tokens are machine-to-machine only; OAuth tokens carry the user
 * who granted consent.
 */
@Component
public class InteropAuthFilter extends OncePerRequestFilter {

    private static final String V1_PREFIX = "Bearer pdt_";
    private static final String OAUTH_PREFIX = "Bearer oat_";

    private final InteropClientRepository v1Clients;
    private final TokenService oauthTokens;
    private final PasswordEncoder passwordEncoder;
    private final TenantContextHolder contextHolder;

    public InteropAuthFilter(
        InteropClientRepository v1Clients,
        TokenService oauthTokens,
        PasswordEncoder passwordEncoder,
        TenantContextHolder contextHolder
    ) {
        this.v1Clients = v1Clients;
        this.oauthTokens = oauthTokens;
        this.passwordEncoder = passwordEncoder;
        this.contextHolder = contextHolder;
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        return !request.getRequestURI().startsWith("/api/v1/interop/");
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        var header = request.getHeader(HttpHeaders.AUTHORIZATION);
        if (header == null) {
            response.sendError(HttpServletResponse.SC_UNAUTHORIZED, "missing token");
            return;
        }

        TenantContext context;
        if (header.startsWith(V1_PREFIX)) {
            context = resolveV1(header.substring("Bearer ".length()));
        } else if (header.startsWith(OAUTH_PREFIX)) {
            context = resolveOAuth(header.substring("Bearer ".length()));
        } else {
            response.sendError(HttpServletResponse.SC_UNAUTHORIZED, "unsupported token scheme");
            return;
        }

        if (context == null) {
            response.sendError(HttpServletResponse.SC_UNAUTHORIZED, "invalid token");
            return;
        }

        var auth = new UsernamePasswordAuthenticationToken(
            context.userId() != null ? context.userId().toString() : "interop-client",
            null,
            List.of(new SimpleGrantedAuthority("ROLE_INTEROP_CLIENT")));
        SecurityContextHolder.getContext().setAuthentication(auth);
        contextHolder.set(context);

        // No try/finally cleanup: TenantContextHolder is @RequestScope and dies with the
        // request; Spring Security's filter chain clears SecurityContextHolder downstream.
        chain.doFilter(request, response);
    }

    private TenantContext resolveV1(String token) {
        // Format: pdt_<client_id_uuid>_<secret>
        var body = token.substring("pdt_".length());
        var underscore = body.indexOf('_');
        if (underscore <= 0) return null;
        try {
            var clientId = UUID.fromString(body.substring(0, underscore));
            var secret = body.substring(underscore + 1);
            var client = v1Clients.findByIdAndActiveTrue(clientId).orElse(null);
            if (client == null || !passwordEncoder.matches(secret, client.getSecretHash())) return null;
            // v1 tokens are machine-to-machine — no user. Model the client's tenant access
            // as a single staff membership with the synthetic INTEROP_CLIENT role.
            return new TenantContext(
                null,
                false,
                List.of(new TenantMembership(client.getTenantId(), "INTEROP_CLIENT")),
                List.of());
        } catch (Exception e) {
            return null;
        }
    }

    private TenantContext resolveOAuth(String token) {
        var accessToken = oauthTokens.resolveAccessToken(token).orElse(null);
        if (accessToken == null) return null;
        // OAuth tokens carry the consenting user; the client's tenant scope is modeled
        // the same way as v1 — a single INTEROP_CLIENT staff membership on that tenant.
        return new TenantContext(
            accessToken.getUserId(),
            false,
            List.of(new TenantMembership(accessToken.getTenantId(), "INTEROP_CLIENT")),
            List.of());
    }
}
