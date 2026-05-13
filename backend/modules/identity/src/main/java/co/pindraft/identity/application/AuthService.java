package co.pindraft.identity.application;

import co.pindraft.common.security.TenantContext;
import co.pindraft.identity.domain.*;
import co.pindraft.identity.infrastructure.*;
import java.security.SecureRandom;
import java.time.Instant;
import java.util.Base64;
import java.util.HexFormat;
import java.util.UUID;
import org.jspecify.annotations.NullMarked;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@NullMarked
public class AuthService {

    private final UserRepository users;
    private final TenantMembershipRepository memberships;
    private final TenantCustomerRepository customers;
    private final RefreshTokenRepository refreshTokens;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final long refreshTtlSeconds;
    private final SecureRandom random = new SecureRandom();

    public AuthService(
        UserRepository users,
        TenantMembershipRepository memberships,
        TenantCustomerRepository customers,
        RefreshTokenRepository refreshTokens,
        PasswordEncoder passwordEncoder,
        JwtService jwtService,
        @Value("${pindraft.jwt.refresh-token-ttl-seconds}") long refreshTtlSeconds
    ) {
        this.users = users;
        this.memberships = memberships;
        this.customers = customers;
        this.refreshTokens = refreshTokens;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
        this.refreshTtlSeconds = refreshTtlSeconds;
    }

    @Transactional
    public TokenPair login(String email, String password) {
        var user = users.findByEmailIgnoreCase(email).orElseThrow(InvalidCredentialsException::new);
        if (!passwordEncoder.matches(password, user.getPasswordHash())) {
            throw new InvalidCredentialsException();
        }
        return issueTokens(user);
    }

    @Transactional
    public TokenPair refresh(String refreshToken) {
        var hash = hashToken(refreshToken);
        var stored = refreshTokens.findByTokenHash(hash).orElseThrow(InvalidRefreshTokenException::new);
        if (!stored.isValid()) {
            throw new InvalidRefreshTokenException();
        }
        var user = users.findById(stored.getUserId()).orElseThrow(InvalidRefreshTokenException::new);

        // Rotation: revoke old, issue new
        var newPair = issueTokens(user);
        // The new refresh token's id is already in DB; record rotation chain on the old one
        var newTokenHash = hashToken(newPair.refreshToken());
        var newToken = refreshTokens.findByTokenHash(newTokenHash).orElseThrow();
        stored.rotateTo(newToken.getId());
        refreshTokens.save(stored);

        return newPair;
    }

    @Transactional
    public void logout(String refreshToken) {
        var hash = hashToken(refreshToken);
        refreshTokens.findByTokenHash(hash).ifPresent(t -> {
            t.revoke();
            refreshTokens.save(t);
        });
    }

    public TokenPair issueTokens(UserEntity user) {
        var staff = memberships.findByUserId(user.getId()).stream()
            .map(m -> new TenantContext.TenantMembership(m.getTenantId(), m.getRole()))
            .toList();
        var cust = customers.findByUserId(user.getId()).stream()
            .map(c -> new TenantContext.TenantCustomer(c.getTenantId(), c.getCustomerKind()))
            .toList();

        var access = jwtService.issueAccessToken(user.getId(), user.isPlatformAdmin(), staff, cust);

        // Refresh token: random 32 bytes, base64url-encoded, stored hashed
        var bytes = new byte[32];
        random.nextBytes(bytes);
        var refreshRaw = Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
        var refreshHash = hashToken(refreshRaw);

        var token = new RefreshTokenEntity(
            UUID.randomUUID(),
            user.getId(),
            refreshHash,
            Instant.now().plusSeconds(refreshTtlSeconds)
        );
        refreshTokens.save(token);

        return new TokenPair(access, refreshRaw);
    }

    private String hashToken(String raw) {
        try {
            var md = java.security.MessageDigest.getInstance("SHA-256");
            var digest = md.digest(raw.getBytes(java.nio.charset.StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(digest);
        } catch (Exception e) {
            throw new RuntimeException("SHA-256 not available", e);
        }
    }

    public record TokenPair(String accessToken, String refreshToken) {}
}
