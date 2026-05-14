package co.pindraft.common.security;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;

import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

/**
 * Tests for {@link TenantAccessGuard#requireRole}. Locks in the platform-admin bypass
 * fix found during smoke testing — a platform admin must be allowed through every
 * tenant role check, matching the spec's "platform admin bypasses tenant scoping".
 */
@ExtendWith(MockitoExtension.class)
class TenantAccessGuardTest {

    @Mock private TenantContextHolder holder;
    private TenantAccessGuard guard;

    private final UUID TENANT = UUID.randomUUID();
    private final UUID USER = UUID.randomUUID();

    @BeforeEach
    void setUp() {
        guard = new TenantAccessGuard(holder);
    }

    @Test
    void requireRole_platform_admin_bypasses_role_check() {
        // Platform admin with no tenant memberships at all — must still pass.
        when(holder.get()).thenReturn(new TenantContext(USER, true, List.of(), List.of()));
        assertThatCode(() -> guard.requireRole(TENANT, "MILL_ADMIN")).doesNotThrowAnyException();
    }

    @Test
    void requireRole_matching_staff_role_passes() {
        when(holder.get()).thenReturn(new TenantContext(
            USER, false,
            List.of(new TenantContext.TenantMembership(TENANT, "MILL_ADMIN")),
            List.of()));
        assertThatCode(() -> guard.requireRole(TENANT, "MILL_ADMIN")).doesNotThrowAnyException();
    }

    @Test
    void requireRole_wrong_staff_role_denied() {
        when(holder.get()).thenReturn(new TenantContext(
            USER, false,
            List.of(new TenantContext.TenantMembership(TENANT, "MILL_OPERATOR")),
            List.of()));
        assertThatThrownBy(() -> guard.requireRole(TENANT, "MILL_ADMIN"))
            .isInstanceOf(TenantAccessDeniedException.class)
            .hasMessageContaining("role:MILL_ADMIN");
    }

    @Test
    void requireRole_no_membership_denied() {
        when(holder.get()).thenReturn(new TenantContext(USER, false, List.of(), List.of()));
        assertThatThrownBy(() -> guard.requireRole(TENANT, "MILL_OPERATOR"))
            .isInstanceOf(TenantAccessDeniedException.class);
    }

    @Test
    void requireStaffAccess_platform_admin_passes_for_any_tenant() {
        when(holder.get()).thenReturn(new TenantContext(USER, true, List.of(), List.of()));
        assertThatCode(() -> guard.requireStaffAccess(TENANT)).doesNotThrowAnyException();
    }

    @Test
    void requireStaffAccess_no_membership_denied() {
        when(holder.get()).thenReturn(new TenantContext(USER, false, List.of(), List.of()));
        assertThatThrownBy(() -> guard.requireStaffAccess(TENANT))
            .isInstanceOf(TenantAccessDeniedException.class);
    }
}
