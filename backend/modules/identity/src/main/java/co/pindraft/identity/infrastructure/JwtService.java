package co.pindraft.identity.infrastructure;

import co.pindraft.common.security.TenantContext;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Date;
import java.util.List;
import java.util.UUID;
import javax.crypto.SecretKey;
import org.jspecify.annotations.NullMarked;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

/**
 * Issues and validates Pindraft access tokens (short-lived JWTs).
 * Refresh tokens are opaque random strings, stored hashed in the database — handled by AuthService.
 */
@Service
@NullMarked
public class JwtService {
    private final SecretKey signingKey;
    private final String issuer;
    private final long accessTtlSeconds;

    public JwtService(
        @Value("${pindraft.jwt.secret}") String secret,
        @Value("${pindraft.jwt.issuer}") String issuer,
        @Value("${pindraft.jwt.access-token-ttl-seconds}") long accessTtlSeconds
    ) {
        this.signingKey = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
        this.issuer = issuer;
        this.accessTtlSeconds = accessTtlSeconds;
    }

    public String issueAccessToken(
        UUID userId,
        boolean platformAdmin,
        List<TenantContext.TenantMembership> staff,
        List<TenantContext.TenantCustomer> customers
    ) {
        var now = Instant.now();
        var expiry = now.plusSeconds(accessTtlSeconds);
        return Jwts.builder()
            .issuer(issuer)
            .subject(userId.toString())
            .issuedAt(Date.from(now))
            .expiration(Date.from(expiry))
            .id(UUID.randomUUID().toString())
            .claim("platform_admin", platformAdmin)
            .claim("staff", staff.stream().map(m -> new String[]{m.tenantId().toString(), m.role()}).toList())
            .claim("customers", customers.stream().map(c -> new String[]{c.tenantId().toString(), c.customerKind()}).toList())
            .signWith(signingKey)
            .compact();
    }

    @SuppressWarnings("unchecked")
    public TenantContext parseAndValidate(String token) {
        try {
            Claims claims = Jwts.parser()
                .verifyWith(signingKey)
                .requireIssuer(issuer)
                .build()
                .parseSignedClaims(token)
                .getPayload();

            UUID userId = UUID.fromString(claims.getSubject());
            boolean isAdmin = Boolean.TRUE.equals(claims.get("platform_admin", Boolean.class));

            List<List<String>> staffRaw = claims.get("staff", List.class);
            List<TenantContext.TenantMembership> staff = staffRaw == null ? List.of() : staffRaw.stream()
                .map(arr -> new TenantContext.TenantMembership(UUID.fromString(arr.get(0)), arr.get(1)))
                .toList();

            List<List<String>> customersRaw = claims.get("customers", List.class);
            List<TenantContext.TenantCustomer> customers = customersRaw == null ? List.of() : customersRaw.stream()
                .map(arr -> new TenantContext.TenantCustomer(UUID.fromString(arr.get(0)), arr.get(1)))
                .toList();

            return new TenantContext(userId, isAdmin, staff, customers);
        } catch (JwtException | IllegalArgumentException e) {
            throw new InvalidJwtException("Invalid or expired token");
        }
    }
}
