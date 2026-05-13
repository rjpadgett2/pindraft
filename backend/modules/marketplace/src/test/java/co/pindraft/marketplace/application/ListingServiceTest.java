package co.pindraft.marketplace.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

import co.pindraft.marketplace.domain.ListingEntity;
import co.pindraft.marketplace.domain.ListingKind;
import co.pindraft.marketplace.domain.ListingStatus;
import co.pindraft.marketplace.infrastructure.ListingRepository;
import java.math.BigDecimal;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class ListingServiceTest {

    @Mock private ListingRepository repo;
    private ListingService service;

    private UUID tenantId;
    private UUID listingId;

    @BeforeEach
    void setUp() {
        service = new ListingService(repo);
        tenantId = UUID.randomUUID();
        listingId = UUID.randomUUID();
    }

    @Test
    void create_returns_draft_listing_with_trace_slug() {
        when(repo.save(any(ListingEntity.class))).thenAnswer(inv -> inv.getArgument(0));

        var listing = service.create(
            tenantId, ListingKind.YARN, "Romney 2-ply worsted", "Plant-dyed indigo",
            new BigDecimal("45"), new BigDecimal("2.5"), "K9MW3T");

        assertThat(listing.getStatus()).isEqualTo(ListingStatus.DRAFT);
        assertThat(listing.getTraceSlug()).isEqualTo("K9MW3T");
        assertThat(listing.getPublishedAt()).isNull();
    }

    @Test
    void publish_moves_draft_to_published_and_sets_published_at() {
        var draft = new ListingEntity(
            listingId, tenantId, ListingKind.FLEECE, "Bramble fleece", null,
            new BigDecimal("8"), new BigDecimal("4"));
        when(repo.findById(listingId)).thenReturn(Optional.of(draft));
        when(repo.save(any(ListingEntity.class))).thenAnswer(inv -> inv.getArgument(0));

        var published = service.publish(tenantId, listingId);

        assertThat(published.getStatus()).isEqualTo(ListingStatus.PUBLISHED);
        assertThat(published.getPublishedAt()).isNotNull();
    }

    @Test
    void publish_rejects_listing_not_in_draft() {
        var draft = new ListingEntity(
            listingId, tenantId, ListingKind.FLEECE, "Bramble fleece", null,
            new BigDecimal("8"), new BigDecimal("4"));
        draft.publish();  // already published
        when(repo.findById(listingId)).thenReturn(Optional.of(draft));

        assertThatThrownBy(() -> service.publish(tenantId, listingId))
            .isInstanceOf(IllegalStateException.class);
    }

    @Test
    void get_public_returns_404_for_non_published_listings() {
        var draft = new ListingEntity(
            listingId, tenantId, ListingKind.FLEECE, "Bramble fleece", null,
            new BigDecimal("8"), new BigDecimal("4"));
        when(repo.findById(listingId)).thenReturn(Optional.of(draft));

        assertThatThrownBy(() -> service.getPublic(listingId))
            .isInstanceOf(ListingNotFoundException.class);
    }

    @Test
    void get_for_tenant_rejects_listing_from_another_tenant() {
        var foreignListing = new ListingEntity(
            listingId, UUID.randomUUID(), ListingKind.YARN, "Foreign", null,
            new BigDecimal("30"), new BigDecimal("1"));
        when(repo.findById(listingId)).thenReturn(Optional.of(foreignListing));

        assertThatThrownBy(() -> service.getForTenant(tenantId, listingId))
            .isInstanceOf(ListingNotFoundException.class);
    }
}
