package co.pindraft.marketplace.api;

import co.pindraft.identity.domain.TenantEntity;
import co.pindraft.identity.domain.TenantKind;
import co.pindraft.identity.domain.TenantStatus;
import co.pindraft.identity.infrastructure.TenantRepository;
import co.pindraft.marketplace.application.ListingService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.List;
import java.util.UUID;
import org.springframework.web.bind.annotation.*;

/**
 * Public mill directory. LIVE mills only, ordered by name. Each summary includes a
 * count of the mill's published listings for the marketplace browse experience.
 */
@RestController
@RequestMapping("/api/v1/public/mills")
@Tag(name = "Public", description = "Public mill directory")
public class MillDirectoryController {

    private final TenantRepository tenants;
    private final ListingService listings;

    public MillDirectoryController(TenantRepository tenants, ListingService listings) {
        this.tenants = tenants;
        this.listings = listings;
    }

    @GetMapping
    @Operation(summary = "List LIVE mills")
    public List<MillSummaryResponse> list() {
        return tenants.findByStatusAndKindOrderByName(TenantStatus.LIVE, TenantKind.MILL).stream()
            .map(this::toSummary)
            .toList();
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get a mill's public profile")
    public MillDetailResponse getOne(@PathVariable UUID id) {
        var tenant = tenants.findById(id)
            .filter(t -> t.getStatus() == TenantStatus.LIVE && t.getKind() == TenantKind.MILL)
            .orElseThrow(() -> new co.pindraft.marketplace.application.ListingNotFoundException(id));
        return new MillDetailResponse(
            tenant.getId(), tenant.getName(), tenant.getDefaultUnit(), tenant.getTimeZone(),
            (int) listings.countPublishedForMill(tenant.getId()));
    }

    private MillSummaryResponse toSummary(TenantEntity t) {
        return new MillSummaryResponse(
            t.getId(), t.getName(),
            (int) listings.countPublishedForMill(t.getId()));
    }

    public record MillSummaryResponse(UUID id, String name, int listingCount) {}
    public record MillDetailResponse(UUID id, String name, String defaultUnit, String timeZone, int listingCount) {}
}
