package co.pindraft.shearer.api;

import co.pindraft.common.security.TenantContextHolder;
import co.pindraft.shearer.application.ShearingEventService;
import co.pindraft.shearer.domain.ShearingEventEntity;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

/**
 * Shearer-side endpoints. User-scoped, no tenant in the URL. The current user must
 * be authenticated; the shearer's own user_id keys all queries.
 */
@RestController
@RequestMapping("/api/v1/me/shearing-events")
@Tag(name = "Shearer", description = "Shearer's own event log")
public class ShearingEventController {

    private final ShearingEventService service;
    private final TenantContextHolder contextHolder;

    public ShearingEventController(ShearingEventService service, TenantContextHolder contextHolder) {
        this.service = service;
        this.contextHolder = contextHolder;
    }

    @GetMapping
    @Operation(summary = "List the current shearer's events, newest first")
    public List<EventResponse> list() {
        var userId = contextHolder.get().userId();
        if (userId == null) throw new IllegalStateException("No authenticated user");
        return service.listForUser(userId).stream().map(ShearingEventController::toResponse).toList();
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Record a shearing event. Idempotent on client_local_id.")
    public EventResponse record(@Valid @RequestBody RecordRequest req) {
        var userId = contextHolder.get().userId();
        if (userId == null) throw new IllegalStateException("No authenticated user");
        var event = service.record(
            userId, req.clientLocalId(), req.animalName(),
            req.animalExternalId(), req.breedCode(), req.fleeceWeightKg(),
            req.shornAt(), req.location(), req.notes());
        return toResponse(event);
    }

    private static EventResponse toResponse(ShearingEventEntity e) {
        return new EventResponse(
            e.getId(), e.getClientLocalId(),
            e.getAnimalName(), e.getAnimalExternalId(), e.getBreedCode(),
            e.getFleeceWeightKg(), e.getShornAt(), e.getLocation(), e.getNotes(),
            e.getCreatedAt());
    }

    public record EventResponse(
        java.util.UUID id, String clientLocalId,
        String animalName, String animalExternalId, String breedCode,
        BigDecimal fleeceWeightKg, Instant shornAt, String location, String notes,
        Instant createdAt) {}

    public record RecordRequest(
        String clientLocalId,
        @NotBlank String animalName,
        String animalExternalId,
        String breedCode,
        BigDecimal fleeceWeightKg,
        @NotNull Instant shornAt,
        String location,
        String notes) {}
}
