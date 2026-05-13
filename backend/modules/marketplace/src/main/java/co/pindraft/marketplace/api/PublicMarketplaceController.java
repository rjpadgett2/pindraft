package co.pindraft.marketplace.api;

import co.pindraft.identity.domain.TenantEntity;
import co.pindraft.identity.infrastructure.TenantRepository;
import co.pindraft.marketplace.application.ListingService;
import co.pindraft.marketplace.domain.ListingEntity;
import co.pindraft.marketplace.domain.ListingKind;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.springframework.web.bind.annotation.*;

/**
 * Unauthenticated public marketplace browse. Whitelisted under {@code /api/v1/public/**}
 * in {@code SecurityConfig}.
 *
 * <p>Each response includes the mill's display name resolved from the tenants table —
 * public viewers don't see raw tenant UUIDs.
 */
@RestController
@RequestMapping("/api/v1/public/listings")
@Tag(name = "Public", description = "Public marketplace browse")
public class PublicMarketplaceController {

    private final ListingService service;
    private final TenantRepository tenants;

    public PublicMarketplaceController(ListingService service, TenantRepository tenants) {
        this.service = service;
        this.tenants = tenants;
    }

    @GetMapping
    @Operation(summary = "Browse published listings, optionally filtered by kind")
    public List<PublicListingResponse> browse(@RequestParam(required = false) ListingKind kind) {
        var listings = service.browsePublished(kind);
        return listings.stream().map(this::toResponse).toList();
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get a published listing's full detail")
    public PublicListingResponse getOne(@PathVariable UUID id) {
        return toResponse(service.getPublic(id));
    }

    private PublicListingResponse toResponse(ListingEntity l) {
        var millName = tenants.findById(l.getTenantId())
            .map(TenantEntity::getName)
            .orElse("Unknown mill");
        return new PublicListingResponse(
            l.getId(), l.getTenantId(), millName, l.getKind(),
            l.getTitle(), l.getDescription(),
            l.getPricePerKg(), l.getQuantityKg(),
            l.getTraceSlug(), l.getPublishedAt());
    }

    public record PublicListingResponse(
        UUID id, UUID tenantId, String millName, ListingKind kind,
        String title, String description,
        BigDecimal pricePerKg, BigDecimal quantityKg,
        String traceSlug, Instant publishedAt) {}
}
