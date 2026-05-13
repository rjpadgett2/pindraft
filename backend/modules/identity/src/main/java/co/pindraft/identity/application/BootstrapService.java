package co.pindraft.identity.application;

import co.pindraft.identity.domain.*;
import co.pindraft.identity.infrastructure.*;
import java.util.UUID;
import org.jspecify.annotations.NullMarked;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * One-time first-admin creation. Disabled in production by {@code pindraft.bootstrap.enabled}.
 *
 * <p>The first user has no way to log in otherwise — there's no auth on this endpoint. The flag
 * gates whether the endpoint is exposed at all.
 */
@Service
@NullMarked
public class BootstrapService {

    private final UserRepository users;
    private final TenantRepository tenants;
    private final TenantMembershipRepository memberships;
    private final PasswordEncoder passwordEncoder;
    private final boolean enabled;

    public BootstrapService(
        UserRepository users,
        TenantRepository tenants,
        TenantMembershipRepository memberships,
        PasswordEncoder passwordEncoder,
        @Value("${pindraft.bootstrap.enabled}") boolean enabled
    ) {
        this.users = users;
        this.tenants = tenants;
        this.memberships = memberships;
        this.passwordEncoder = passwordEncoder;
        this.enabled = enabled;
    }

    @Transactional
    public BootstrapResult createFirstAdmin(String email, String password, String name, String tenantName) {
        if (!enabled) {
            throw new BootstrapDisabledException();
        }
        if (users.existsByEmailIgnoreCase(email)) {
            throw new EmailAlreadyExistsException(email);
        }

        var user = new UserEntity(
            UUID.randomUUID(), email, passwordEncoder.encode(password), name, true);
        users.save(user);

        var tenant = new TenantEntity(UUID.randomUUID(), tenantName, TenantKind.MILL);
        tenants.save(tenant);

        var membership = new TenantMembershipEntity(
            UUID.randomUUID(), user.getId(), tenant.getId(), "MILL_ADMIN");
        memberships.save(membership);

        return new BootstrapResult(user.getId(), tenant.getId());
    }

    public record BootstrapResult(UUID userId, UUID tenantId) {}
}
