package co.pindraft.shearer.application;

import co.pindraft.shearer.domain.ShearingEventEntity;
import co.pindraft.shearer.infrastructure.ShearingEventRepository;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.jspecify.annotations.NullMarked;
import org.jspecify.annotations.Nullable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Shearing event lifecycle. Idempotent on {@code clientLocalId} — if the shearer's PWA
 * retries a sync for an event that already landed, the second call returns the existing
 * record rather than creating a duplicate. This is essential for offline-first sync.
 */
@Service
@NullMarked
public class ShearingEventService {

    private final ShearingEventRepository repo;

    public ShearingEventService(ShearingEventRepository repo) {
        this.repo = repo;
    }

    public List<ShearingEventEntity> listForUser(UUID shearerUserId) {
        return repo.findByShearerUserIdOrderByShornAtDesc(shearerUserId);
    }

    @Transactional
    public ShearingEventEntity record(
        UUID shearerUserId,
        @Nullable String clientLocalId,
        String animalName,
        @Nullable String animalExternalId,
        @Nullable String breedCode,
        @Nullable BigDecimal fleeceWeightKg,
        Instant shornAt,
        @Nullable String location,
        @Nullable String notes
    ) {
        // Idempotency on clientLocalId — return existing if this client has already synced
        if (clientLocalId != null) {
            var existing = repo.findByShearerUserIdAndClientLocalId(shearerUserId, clientLocalId);
            if (existing.isPresent()) return existing.get();
        }

        var event = new ShearingEventEntity(UUID.randomUUID(), shearerUserId, animalName, shornAt);
        event.setClientLocalId(clientLocalId);
        event.setAnimalExternalId(animalExternalId);
        event.setBreedCode(breedCode);
        event.setFleeceWeightKg(fleeceWeightKg);
        event.setLocation(location);
        event.setNotes(notes);
        return repo.save(event);
    }
}
