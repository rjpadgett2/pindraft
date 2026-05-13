package co.pindraft.identity.infrastructure;

import co.pindraft.common.security.TenantContext;
import co.pindraft.common.security.TenantContextHolder;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

/**
 * Per-request JWT validation + TenantContext population.
 *
 * <p>If a valid bearer token is present:
 * <ol>
 *   <li>Parse and validate the JWT.</li>
 *   <li>Populate the request-scoped {@link TenantContextHolder} for repositories and guards.</li>
 *   <li>Set a Spring Security {@link UsernamePasswordAuthenticationToken} so {@code @PreAuthorize} works.</li>
 * </ol>
 *
 * <p>If absent or invalid: pass through. The endpoint's security config decides whether
 * unauthenticated access is allowed.
 */
@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final JwtService jwtService;
    // ObjectProvider used because TenantContextHolder is request-scoped
    private final ObjectProvider<TenantContextHolder> contextHolder;

    public JwtAuthenticationFilter(JwtService jwtService, ObjectProvider<TenantContextHolder> contextHolder) {
        this.jwtService = jwtService;
        this.contextHolder = contextHolder;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
        throws ServletException, IOException {

        var header = request.getHeader("Authorization");
        if (header != null && header.startsWith("Bearer ")) {
            var token = header.substring("Bearer ".length()).trim();
            try {
                TenantContext context = jwtService.parseAndValidate(token);
                contextHolder.getObject().set(context);

                var authorities = context.isPlatformAdmin()
                    ? java.util.List.of(new SimpleGrantedAuthority("ROLE_PLATFORM_ADMIN"))
                    : java.util.List.<SimpleGrantedAuthority>of();
                var auth = new UsernamePasswordAuthenticationToken(context.userId(), null, authorities);
                SecurityContextHolder.getContext().setAuthentication(auth);
            } catch (InvalidJwtException e) {
                // Don't 401 here — let downstream security handle anonymous access
            }
        }
        chain.doFilter(request, response);
    }
}
