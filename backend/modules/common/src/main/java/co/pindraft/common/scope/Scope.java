package co.pindraft.common.scope;

/**
 * The three data scopes every Pindraft table belongs to. Enforced at the JPA repository layer
 * by base repositories that consult {@link co.pindraft.common.security.TenantContext}.
 *
 * <p>See {@code docs/Pindraft_Spec.md} → "Three data scopes" for the cross-reference rules
 * between scopes.
 */
public enum Scope {
    /**
     * Cross-tenant readable. Reference taxonomies, users, tenants, marketplace listings,
     * trace records.
     */
    PLATFORM_SHARED,

    /**
     * Every row carries {@code tenant_id}; access filtered by the user's relationship
     * to that tenant (staff membership or customer relationship).
     */
    TENANT_SCOPED,

    /**
     * Every row carries {@code owner_user_id}; access checked by user identity.
     */
    USER_SCOPED
}
