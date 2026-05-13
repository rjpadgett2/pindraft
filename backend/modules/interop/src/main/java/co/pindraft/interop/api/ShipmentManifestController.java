package co.pindraft.interop.api;

import co.pindraft.common.security.TenantContextHolder;
import co.pindraft.interop.application.ShipmentManifestService;
import co.pindraft.mill_ops.ReservationCreator.Reservation;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

/**
 * Hirsel-facing manifest endpoint. Auth via bearer token resolves the tenant scope
 * automatically (the {@code InteropClient} is scoped to one tenant). The manifest
 * carries the shepherd's external identity which is resolved or auto-created here.
 *
 * <p>Idempotency: re-POSTing the same {@code externalShipmentId} returns the existing
 * reservation rather than creating a duplicate. This makes Hirsel-side retry safe.
 */
@RestController
@RequestMapping("/api/v1/interop/v1/shipments")
@Tag(name = "Interop", description = "External system integration (Hirsel etc.)")
public class ShipmentManifestController {

    private final ShipmentManifestService service;
    private final TenantContextHolder contextHolder;

    public ShipmentManifestController(ShipmentManifestService service, TenantContextHolder contextHolder) {
        this.service = service;
        this.contextHolder = contextHolder;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Submit a shipment manifest. Idempotent on external_shipment_id.")
    public ShipmentReceipt submit(@Valid @RequestBody ManifestRequest req) {
        // Interop clients always carry exactly one staff membership on their owning tenant —
        // see InteropAuthFilter. Anything else is a misconfigured token and should 401 upstream.
        var tenantId = contextHolder.get().staffMemberships().stream()
            .findFirst()
            .map(co.pindraft.common.security.TenantContext.TenantMembership::tenantId)
            .orElseThrow(() -> new IllegalStateException("interop request has no tenant binding"));
        var slotStart = req.expectedArrivalDate().atStartOfDay().toInstant(ZoneOffset.UTC);
        var totalWeight = req.fleeces().stream()
            .map(FleeceManifest::estimatedGreaseWeightKg)
            .reduce(BigDecimal.ZERO, BigDecimal::add);

        Reservation result = service.ingest(
            tenantId,
            req.externalShipmentId(),
            req.shepherd().externalCustomerId(),
            req.shepherd().displayName(),
            totalWeight,
            slotStart,
            "hirsel");

        return new ShipmentReceipt(
            result.id().toString(),
            result.externalShipmentId(),
            result.status().name());
    }

    public record ManifestRequest(
        @NotBlank String externalShipmentId,
        @NotNull LocalDate expectedArrivalDate,
        @NotNull ShepherdInfo shepherd,
        @NotEmpty List<FleeceManifest> fleeces
    ) {}

    public record ShepherdInfo(
        @NotBlank String externalCustomerId,
        @NotBlank String displayName
    ) {}

    public record FleeceManifest(
        @NotBlank String externalFleeceId,
        @NotNull @Positive BigDecimal estimatedGreaseWeightKg,
        String breedCode,
        String sourceAnimalName
    ) {}

    public record ShipmentReceipt(
        String shipmentId,
        String externalShipmentId,
        String status
    ) {}
}
