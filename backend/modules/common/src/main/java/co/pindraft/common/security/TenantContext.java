package co.pindraft.common.security;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.jspecify.annotations.NullMarked;
import org.jspecify.annotations.Nullable;

/**
 * Request-scoped record carrying the authenticated user's identity and tenant relationships.
 *
 * <p>Populated by {@code TenantContextFilter} on every authenticated request from the
 * validated JWT. Repositories and authorization guards consult this to enforce data scope.
 *
 * <p>A user can have any combination of:
 * <ul>
 *   <li>Platform admin flag — bypasses tenant scoping</li>
 *   <li>Staff memberships — {@code (tenant_id, role)} for tenants they work for</li>
 *   <li>Customer relationships — {@code (tenant_id, customer_kind)} for tenants they transact with</li>
 * </ul>
 *
 * <p>Anonymous requests carry a context with {@code userId == null} and empty membership lists.
 */
@NullMarked
public record TenantContext(
    @Nullable UUID userId,
    boolean isPlatformAdmin,
    List<TenantMembership> staffMemberships,
    List<TenantCustomer> customerRelationships
) {
    public static TenantContext anonymous() {
        return new TenantContext(null, false, List.of(), List.of());
    }

    public boolean isAuthenticated() {
        return userId != null;
    }

    public boolean hasStaffAccessTo(UUID tenantId) {
        return isPlatformAdmin
            || staffMemberships.stream().anyMatch(m -> m.tenantId().equals(tenantId));
    }

    public boolean hasCustomerAccessTo(UUID tenantId) {
        return customerRelationships.stream().anyMatch(c -> c.tenantId().equals(tenantId));
    }

    public boolean hasAnyAccessTo(UUID tenantId) {
        return hasStaffAccessTo(tenantId) || hasCustomerAccessTo(tenantId);
    }

    public Optional<String> staffRoleAt(UUID tenantId) {
        if (isPlatformAdmin) return Optional.of("PLATFORM_ADMIN");
        return staffMemberships.stream()
            .filter(m -> m.tenantId().equals(tenantId))
            .map(TenantMembership::role)
            .findFirst();
    }

    public record TenantMembership(UUID tenantId, String role) {}
    public record TenantCustomer(UUID tenantId, String customerKind) {}
}
