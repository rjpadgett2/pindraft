package co.pindraft.marketplace.api;

import co.pindraft.common.security.TenantAccessGuard;
import co.pindraft.marketplace.application.ListingService;
import co.pindraft.marketplace.domain.ListingEntity;
import co.pindraft.marketplace.domain.ListingKind;
import co.pindraft.marketplace.domain.ListingStatus;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

/**
 * Tenant-scoped listing admin. Mill staff create, edit, publish, and archive listings.
 */
@RestController
@RequestMapping("/api/v1/tenants/{tenantId}/listings")
@Tag(name = "Marketplace", description = "Mill-side listing management")
public class ListingController {

    private final ListingService service;
    private final TenantAccessGuard accessGuard;

    public ListingController(ListingService service, TenantAccessGuard accessGuard) {
        this.service = service;
        this.accessGuard = accessGuard;
    }

    @GetMapping
    @Operation(summary = "List the mill's listings, optionally filtered by status")
    public List<ListingResponse> list(
        @PathVariable UUID tenantId,
        @RequestParam(required = false) ListingStatus status
    ) {
        accessGuard.requireStaffAccess(tenantId);
        return service.listForTenant(tenantId, status).stream().map(ListingController::toResponse).toList();
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get one listing")
    public ListingResponse getOne(@PathVariable UUID tenantId, @PathVariable UUID id) {
        accessGuard.requireStaffAccess(tenantId);
        return toResponse(service.getForTenant(tenantId, id));
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Create a draft listing")
    public ListingResponse create(@PathVariable UUID tenantId, @Valid @RequestBody CreateRequest req) {
        accessGuard.requireStaffAccess(tenantId);
        var listing = service.create(
            tenantId, req.kind(), req.title(), req.description(),
            req.pricePerKg(), req.quantityKg(), req.traceSlug());
        return toResponse(listing);
    }

    @PatchMapping("/{id}")
    @Operation(summary = "Update a listing's editable fields")
    public ListingResponse update(
        @PathVariable UUID tenantId, @PathVariable UUID id, @RequestBody UpdateRequest req
    ) {
        accessGuard.requireStaffAccess(tenantId);
        return toResponse(service.update(
            tenantId, id, req.title(), req.description(),
            req.pricePerKg(), req.quantityKg(), req.traceSlug()));
    }

    @PostMapping("/{id}/publish")
    @Operation(summary = "Move a DRAFT listing to PUBLISHED — visible publicly")
    public ListingResponse publish(@PathVariable UUID tenantId, @PathVariable UUID id) {
        accessGuard.requireStaffAccess(tenantId);
        return toResponse(service.publish(tenantId, id));
    }

    @PostMapping("/{id}/sold")
    @Operation(summary = "Mark a PUBLISHED listing as SOLD")
    public ListingResponse markSold(@PathVariable UUID tenantId, @PathVariable UUID id) {
        accessGuard.requireStaffAccess(tenantId);
        return toResponse(service.markSold(tenantId, id));
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Operation(summary = "Archive a listing")
    public void archive(@PathVariable UUID tenantId, @PathVariable UUID id) {
        accessGuard.requireStaffAccess(tenantId);
        service.archive(tenantId, id);
    }

    static ListingResponse toResponse(ListingEntity l) {
        return new ListingResponse(
            l.getId(), l.getTenantId(), l.getKind(), l.getTitle(), l.getDescription(),
            l.getPricePerKg(), l.getQuantityKg(), l.getStatus(), l.getTraceSlug(),
            l.getCreatedAt(), l.getPublishedAt());
    }

    public record ListingResponse(
        UUID id, UUID tenantId, ListingKind kind, String title, String description,
        BigDecimal pricePerKg, BigDecimal quantityKg, ListingStatus status, String traceSlug,
        Instant createdAt, Instant publishedAt) {}

    public record CreateRequest(
        @NotNull ListingKind kind,
        @NotBlank String title,
        String description,
        @NotNull @Positive BigDecimal pricePerKg,
        @NotNull @Positive BigDecimal quantityKg,
        String traceSlug) {}

    public record UpdateRequest(
        String title, String description,
        BigDecimal pricePerKg, BigDecimal quantityKg,
        String traceSlug) {}
}
