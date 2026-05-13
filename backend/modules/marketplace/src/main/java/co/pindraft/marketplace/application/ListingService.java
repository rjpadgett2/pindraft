package co.pindraft.marketplace.application;

import co.pindraft.marketplace.domain.ListingEntity;
import co.pindraft.marketplace.domain.ListingKind;
import co.pindraft.marketplace.domain.ListingStatus;
import co.pindraft.marketplace.events.ListingPublishedEvent;
import co.pindraft.marketplace.events.ListingSoldEvent;
import co.pindraft.marketplace.infrastructure.ListingRepository;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.jspecify.annotations.Nullable;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ListingService {

    private final ListingRepository repo;
    private final ApplicationEventPublisher eventPublisher;

    public ListingService(ListingRepository repo, ApplicationEventPublisher eventPublisher) {
        this.repo = repo;
        this.eventPublisher = eventPublisher;
    }

    public List<ListingEntity> listForTenant(UUID tenantId, @Nullable ListingStatus status) {
        return status == null
            ? repo.findByTenantIdOrderByCreatedAtDesc(tenantId)
            : repo.findByTenantIdAndStatusOrderByCreatedAtDesc(tenantId, status);
    }

    public ListingEntity getForTenant(UUID tenantId, UUID id) {
        var listing = repo.findById(id).orElseThrow(() -> new ListingNotFoundException(id));
        if (!listing.getTenantId().equals(tenantId)) throw new ListingNotFoundException(id);
        return listing;
    }

    @Transactional
    public ListingEntity create(UUID tenantId, ListingKind kind, String title, @Nullable String description,
                                BigDecimal pricePerKg, BigDecimal quantityKg, @Nullable String traceSlug) {
        var listing = new ListingEntity(
            UUID.randomUUID(), tenantId, kind, title, description, pricePerKg, quantityKg);
        if (traceSlug != null && !traceSlug.isBlank()) {
            listing.updateContent(null, null, null, null, traceSlug);
        }
        return repo.save(listing);
    }

    @Transactional
    public ListingEntity update(UUID tenantId, UUID id, @Nullable String title, @Nullable String description,
                                @Nullable BigDecimal pricePerKg, @Nullable BigDecimal quantityKg,
                                @Nullable String traceSlug) {
        var listing = getForTenant(tenantId, id);
        listing.updateContent(title, description, pricePerKg, quantityKg, traceSlug);
        return repo.save(listing);
    }

    @Transactional
    public ListingEntity publish(UUID tenantId, UUID id) {
        var listing = getForTenant(tenantId, id);
        listing.publish();
        repo.save(listing);

        eventPublisher.publishEvent(new ListingPublishedEvent(
            listing.getId(), tenantId,
            listing.getKind().name(), listing.getTitle(),
            listing.getPricePerKg(), listing.getQuantityKg(),
            listing.getTraceSlug(), Instant.now()));

        return listing;
    }

    @Transactional
    public ListingEntity markSold(UUID tenantId, UUID id) {
        var listing = getForTenant(tenantId, id);
        listing.markSold();
        repo.save(listing);

        eventPublisher.publishEvent(new ListingSoldEvent(
            listing.getId(), tenantId,
            listing.getPricePerKg(), listing.getQuantityKg(), Instant.now()));

        return listing;
    }

    @Transactional
    public void archive(UUID tenantId, UUID id) {
        var listing = getForTenant(tenantId, id);
        listing.archive();
        repo.save(listing);
    }

    public List<ListingEntity> browsePublished(@Nullable ListingKind kind) {
        return kind == null
            ? repo.findByStatusOrderByPublishedAtDesc(ListingStatus.PUBLISHED)
            : repo.findByStatusAndKindOrderByPublishedAtDesc(ListingStatus.PUBLISHED, kind);
    }

    public List<ListingEntity> browsePublishedForMill(UUID tenantId) {
        return repo.findPublishedForTenant(ListingStatus.PUBLISHED, tenantId);
    }

    public ListingEntity getPublic(UUID id) {
        var listing = repo.findById(id).orElseThrow(() -> new ListingNotFoundException(id));
        if (listing.getStatus() != ListingStatus.PUBLISHED) {
            throw new ListingNotFoundException(id);
        }
        return listing;
    }

    public long countPublishedForMill(UUID tenantId) {
        return repo.countByStatusAndTenantId(ListingStatus.PUBLISHED, tenantId);
    }
}
