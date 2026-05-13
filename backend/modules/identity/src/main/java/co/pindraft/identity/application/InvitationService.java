package co.pindraft.identity.application;

import co.pindraft.identity.domain.*;
import co.pindraft.identity.infrastructure.*;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;
import java.util.Base64;
import java.util.HexFormat;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import org.jspecify.annotations.NullMarked;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Operator invitation flow.
 *
 * <p>An admin invites a person (by email) to a tenant in a specific role. The system
 * mints a 32-byte secure random token, returns the plaintext exactly once for the
 * admin to forward (email integration is v1.1 work — provider undecided), and stores
 * only a SHA-256 hash for the matching at accept time.
 *
 * <p>Accept finds-or-creates the user by email. If the user exists, no password is
 * needed (they sign in with their existing credentials). If the user is new, the
 * payload must include {@code name} and {@code password}.
 */
@Service
@NullMarked
public class InvitationService {

    private static final SecureRandom RANDOM = new SecureRandom();
    private static final Duration DEFAULT_TTL = Duration.ofDays(14);
    private static final Set<String> ALLOWED_ROLES = Set.of("MILL_ADMIN", "MILL_OPERATOR");

    private final TenantInvitationRepository invitations;
    private final UserRepository users;
    private final TenantRepository tenants;
    private final TenantMembershipRepository memberships;
    private final PasswordEncoder passwordEncoder;

    public InvitationService(
        TenantInvitationRepository invitations,
        UserRepository users,
        TenantRepository tenants,
        TenantMembershipRepository memberships,
        PasswordEncoder passwordEncoder
    ) {
        this.invitations = invitations;
        this.users = users;
        this.tenants = tenants;
        this.memberships = memberships;
        this.passwordEncoder = passwordEncoder;
    }

    @Transactional
    public InviteResult invite(UUID tenantId, String email, String role, UUID invitedByUserId) {
        if (!ALLOWED_ROLES.contains(role)) {
            throw new IllegalArgumentException("unsupported role: " + role);
        }
        if (tenants.findById(tenantId).isEmpty()) {
            throw new IllegalArgumentException("tenant not found: " + tenantId);
        }

        var bytes = new byte[32];
        RANDOM.nextBytes(bytes);
        var plaintextToken = Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
        var tokenHash = sha256(plaintextToken);

        var entity = new TenantInvitationEntity(
            UUID.randomUUID(), tenantId, email, role, tokenHash, invitedByUserId,
            Instant.now().plus(DEFAULT_TTL));
        invitations.save(entity);
        return new InviteResult(entity, plaintextToken);
    }

    @Transactional
    public AcceptResult accept(String plaintextToken, AcceptInput input) {
        var tokenHash = sha256(plaintextToken);
        var invite = invitations.findByTokenHash(tokenHash)
            .orElseThrow(() -> new InvitationNotFoundException());

        if (!invite.isUsable(Instant.now())) {
            if (invite.getStatus() == InvitationStatus.PENDING) {
                invite.markExpired();
                invitations.save(invite);
            }
            throw new InvitationNotUsableException(invite.getStatus());
        }

        var existing = users.findByEmailIgnoreCase(invite.getEmail()).orElse(null);
        UserEntity user;
        if (existing == null) {
            if (input.password() == null || input.password().isBlank()
                || input.name() == null || input.name().isBlank()) {
                throw new InvitationAcceptInvalidException("name and password required for new user");
            }
            user = new UserEntity(
                UUID.randomUUID(), invite.getEmail(),
                passwordEncoder.encode(input.password()),
                input.name(), false);
            users.save(user);
        } else {
            user = existing;
        }

        // Don't double-membership if the user is already a member of this tenant.
        var alreadyMember = memberships.findByUserIdAndTenantId(user.getId(), invite.getTenantId());
        if (alreadyMember.isEmpty()) {
            memberships.save(new TenantMembershipEntity(
                UUID.randomUUID(), user.getId(), invite.getTenantId(), invite.getRole()));
        }

        invite.markAccepted(user.getId());
        invitations.save(invite);
        return new AcceptResult(user.getId(), invite.getTenantId(), invite.getRole());
    }

    @Transactional
    public TenantInvitationEntity revoke(UUID invitationId) {
        var invite = invitations.findById(invitationId)
            .orElseThrow(InvitationNotFoundException::new);
        if (invite.getStatus() == InvitationStatus.PENDING) {
            invite.markRevoked();
            invitations.save(invite);
        }
        return invite;
    }

    public List<TenantInvitationEntity> listForTenant(UUID tenantId) {
        return invitations.findByTenantIdOrderByCreatedAtDesc(tenantId);
    }

    public TenantInvitationEntity findByToken(String plaintextToken) {
        return invitations.findByTokenHash(sha256(plaintextToken))
            .orElseThrow(InvitationNotFoundException::new);
    }

    private static String sha256(String s) {
        try {
            var md = MessageDigest.getInstance("SHA-256");
            return HexFormat.of().formatHex(md.digest(s.getBytes()));
        } catch (Exception e) {
            throw new IllegalStateException("SHA-256 unavailable", e);
        }
    }

    public record InviteResult(TenantInvitationEntity invitation, String plaintextToken) {}
    public record AcceptInput(String password, String name) {}
    public record AcceptResult(UUID userId, UUID tenantId, String role) {}
}
