package co.pindraft.mill_ops.api;

import co.pindraft.common.security.TenantAccessGuard;
import co.pindraft.mill_ops.application.ReservationService;
import co.pindraft.mill_ops.domain.ReservationEntity;
import co.pindraft.mill_ops.domain.ReservationStatus;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/tenants/{tenantId}/reservations")
@Tag(name = "Operations", description = "Reservation lifecycle")
public class ReservationController {

    private final ReservationService service;
    private final TenantAccessGuard accessGuard;

    public ReservationController(ReservationService service, TenantAccessGuard accessGuard) {
        this.service = service;
        this.accessGuard = accessGuard;
    }

    @GetMapping
    @Operation(summary = "List reservations, optionally filtered by status")
    public List<ReservationResponse> list(
        @PathVariable UUID tenantId,
        @RequestParam(required = false) ReservationStatus status
    ) {
        accessGuard.requireStaffAccess(tenantId);
        return service.listForTenant(tenantId, status).stream()
            .map(ReservationController::toResponse).toList();
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get a reservation by ID")
    public ReservationResponse getOne(@PathVariable UUID tenantId, @PathVariable UUID id) {
        accessGuard.requireStaffAccess(tenantId);
        return toResponse(service.getOne(tenantId, id));
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Create a reservation")
    public ReservationResponse create(@PathVariable UUID tenantId, @Valid @RequestBody CreateRequest req) {
        accessGuard.requireStaffAccess(tenantId);
        var r = service.create(tenantId, req.customerId(), req.pricingArrangementId(),
            req.expectedWeightKg(), req.slotStart());
        return toResponse(r);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Operation(summary = "Cancel a pending reservation")
    public void cancel(@PathVariable UUID tenantId, @PathVariable UUID id) {
        accessGuard.requireStaffAccess(tenantId);
        service.cancel(tenantId, id);
    }

    private static ReservationResponse toResponse(ReservationEntity r) {
        return new ReservationResponse(
            r.getId(), r.getCustomerId(), r.getPricingArrangementId(),
            r.getExpectedWeightKg(), r.getSlotStart(), r.getStatus(),
            r.getExternalSource());
    }

    public record ReservationResponse(
        UUID id, UUID customerId, UUID pricingArrangementId,
        BigDecimal expectedWeightKg, Instant slotStart, ReservationStatus status,
        String externalSource
    ) {}

    public record CreateRequest(
        @NotNull UUID customerId,
        UUID pricingArrangementId,
        @NotNull @Positive BigDecimal expectedWeightKg,
        @NotNull Instant slotStart
    ) {}
}
