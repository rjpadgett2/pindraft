package co.pindraft.common.security;

import java.util.UUID;
import org.springframework.stereotype.Component;

/**
 * Resource-level authorization for tenant-scoped resources.
 *
 * <p>Two modes:
 * <ul>
 *   <li><b>Staff access</b> — the user is a {@code MILL_ADMIN} or {@code MILL_OPERATOR}
 *       at the tenant. Used by ops console endpoints.</li>
 *   <li><b>Customer access</b> — the user is a shepherd or designer who transacts with
 *       the tenant. Used by customer portal endpoints, including the shepherd's
 *       cross-mill view of their own lots.</li>
 * </ul>
 *
 * <p>For each guarded operation, the controller calls {@link #requireStaffAccess} or
 * {@link #requireCustomerAccess} early, before touching the resource.
 */
@Component
public class TenantAccessGuard {

    private final TenantContextHolder contextHolder;

    public TenantAccessGuard(TenantContextHolder contextHolder) {
        this.contextHolder = contextHolder;
    }

    public void requireStaffAccess(UUID tenantId) {
        if (!contextHolder.get().hasStaffAccessTo(tenantId)) {
            throw new TenantAccessDeniedException(tenantId, "staff");
        }
    }

    public void requireCustomerAccess(UUID tenantId) {
        if (!contextHolder.get().hasCustomerAccessTo(tenantId)) {
            throw new TenantAccessDeniedException(tenantId, "customer");
        }
    }

    public void requireAnyAccess(UUID tenantId) {
        if (!contextHolder.get().hasAnyAccessTo(tenantId)) {
            throw new TenantAccessDeniedException(tenantId, "any");
        }
    }

    public void requireRole(UUID tenantId, String role) {
        var ctx = contextHolder.get();
        // Platform admins bypass tenant role checks — matches the spec's "platform admin
        // bypasses tenant scoping" and the hasStaffAccessTo behavior, where platform
        // admin always grants access.
        if (ctx.isPlatformAdmin()) return;
        var actual = ctx.staffRoleAt(tenantId);
        if (actual.isEmpty() || !actual.get().equals(role)) {
            throw new TenantAccessDeniedException(tenantId, "role:" + role);
        }
    }
}
