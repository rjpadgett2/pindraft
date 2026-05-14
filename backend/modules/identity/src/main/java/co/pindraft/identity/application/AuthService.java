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
    private final TenantRepository tenants;
    private final TenantMembershipRepository memberships;
    private final TenantCustomerRepository customers;
    private final RefreshTokenRepository refreshTokens;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final long refreshTtlSeconds;
    private final SecureRandom random = new SecureRandom();

    public AuthService(
        UserRepository users,
        TenantRepository tenants,
        TenantMembershipRepository memberships,
        TenantCustomerRepository customers,
        RefreshTokenRepository refreshTokens,
        PasswordEncoder passwordEncoder,
        JwtService jwtService,
        @Value("${pindraft.jwt.refresh-token-ttl-seconds}") long refreshTtlSeconds
    ) {
        this.users = users;
        this.tenants = tenants;
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

    /**
     * Public registration — creates a fresh user with no tenant relationships and
     * immediately issues tokens (auto-login). Use this for the customer-portal
     * sign-up flow. {@code userType} is optional and informational ({@code SHEPHERD}
     * or {@code DESIGNER} typically); used to tailor the post-signup landing
     * experience but does not grant access to anything.
     */
    @Transactional
    public TokenPair register(String email, String password, String name,
                              @org.jspecify.annotations.Nullable String userType) {
        if (users.existsByEmailIgnoreCase(email)) {
            throw new EmailAlreadyExistsException(email);
        }
        var user = new UserEntity(
            UUID.randomUUID(), email, passwordEncoder.encode(password), name, false, userType);
        users.save(user);
        return issueTokens(user);
    }

    /** Backwards-compatible overload used by the ops-console legacy path. */
    @Transactional
    public TokenPair register(String email, String password, String name) {
        return register(email, password, name, null);
    }

    /**
     * Self-service mill registration. Creates a user + tenant + MILL_ADMIN
     * membership atomically. The new tenant starts in {@code SETUP} status so it
     * doesn't appear in the public mill directory until the admin completes
     * onboarding and clicks "Go live".
     */
    @Transactional
    public RegisterMillResult registerMill(
        String email, String password, String name, String millName
    ) {
        if (users.existsByEmailIgnoreCase(email)) {
            throw new EmailAlreadyExistsException(email);
        }
        var user = new UserEntity(
            UUID.randomUUID(), email, passwordEncoder.encode(password), name, false, "MILL_STAFF");
        users.save(user);

        var tenant = new TenantEntity(UUID.randomUUID(), millName, TenantKind.MILL);
        // Tenant defaults to SETUP — see TenantStatus; SETUP keeps it out of the
        // public directory and gates the operator screens until onboarding completes.
        var savedTenant = tenants.save(tenant);

        var membership = new TenantMembershipEntity(
            UUID.randomUUID(), user.getId(), savedTenant.getId(), "MILL_ADMIN");
        memberships.save(membership);

        var tokens = issueTokens(user);
        return new RegisterMillResult(user.getId(), savedTenant.getId(), tokens);
    }

    /**
     * Shearer registration. Same as the generic register but pins
     * {@code userType=SHEARER} so the shearer-pwa knows to route to its booking
     * surfaces post-login.
     */
    @Transactional
    public TokenPair registerShearer(String email, String password, String name) {
        return register(email, password, name, "SHEARER");
    }

    public record RegisterMillResult(UUID userId, UUID tenantId, TokenPair tokens) {}

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
