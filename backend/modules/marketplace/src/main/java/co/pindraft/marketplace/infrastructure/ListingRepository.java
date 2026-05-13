package co.pindraft.marketplace.infrastructure;

import co.pindraft.marketplace.domain.ListingEntity;
import co.pindraft.marketplace.domain.ListingKind;
import co.pindraft.marketplace.domain.ListingStatus;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ListingRepository extends JpaRepository<ListingEntity, UUID> {

    /** All listings for a tenant, newest first — for the mill's admin view. */
    List<ListingEntity> findByTenantIdOrderByCreatedAtDesc(UUID tenantId);

    /** Optionally filtered by status. */
    List<ListingEntity> findByTenantIdAndStatusOrderByCreatedAtDesc(UUID tenantId, ListingStatus status);

    /** Published listings — the public browse base query. */
    List<ListingEntity> findByStatusOrderByPublishedAtDesc(ListingStatus status);

    /** Public browse filtered by kind. */
    List<ListingEntity> findByStatusAndKindOrderByPublishedAtDesc(ListingStatus status, ListingKind kind);

    /** Published listings from one specific mill — for the mill detail page. */
    @Query("SELECT l FROM ListingEntity l WHERE l.status = :status AND l.tenantId = :tenantId ORDER BY l.publishedAt DESC")
    List<ListingEntity> findPublishedForTenant(@Param("status") ListingStatus status, @Param("tenantId") UUID tenantId);

    long countByStatusAndTenantId(ListingStatus status, UUID tenantId);
}
