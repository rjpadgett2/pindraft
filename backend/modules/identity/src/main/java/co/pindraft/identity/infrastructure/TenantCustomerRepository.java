package co.pindraft.identity.infrastructure;

import co.pindraft.identity.domain.TenantCustomerEntity;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface TenantCustomerRepository extends JpaRepository<TenantCustomerEntity, UUID> {

    /** All Pindraft customer records associated with one user. Cross-tenant. */
    List<TenantCustomerEntity> findByUserId(UUID userId);

    /** All customers at a specific tenant. */
    List<TenantCustomerEntity> findByTenantIdOrderByDisplayName(UUID tenantId);

    /**
     * Lookup by external identity. Used by interop's manifest ingest to resolve a
     * shepherd from a Hirsel external_user_id without scanning the full customers table.
     */
    Optional<TenantCustomerEntity> findByTenantIdAndExternalSourceAndExternalUserId(
        UUID tenantId, String externalSource, String externalUserId);

    /**
     * Unlinked walk-in records whose email matches the given address. Used by the
     * auto-link pass at user registration to backfill {@code user_id} for any
     * walk-ins a mill recorded with this address before the user signed up.
     */
    List<TenantCustomerEntity> findByEmailIgnoreCaseAndUserIdIsNull(String email);

    /** Single user lookup for the operator-side "what's already known about this user" view. */
    Optional<TenantCustomerEntity> findByTenantIdAndUserId(UUID tenantId, UUID userId);

    /** Claim-code redemption lookup. The index on {@code claim_code} keeps this O(1). */
    Optional<TenantCustomerEntity> findByClaimCode(String claimCode);
}
