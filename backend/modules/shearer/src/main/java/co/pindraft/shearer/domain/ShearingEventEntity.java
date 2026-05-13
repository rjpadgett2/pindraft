package co.pindraft.shearer.domain;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;
import org.jspecify.annotations.NullMarked;
import org.jspecify.annotations.Nullable;

/**
 * One animal shorn. Keyed by the shearer's user_id; no tenant context.
 *
 * <p>{@code animalExternalId} is the Hirsel animal UUID (or any other external system's
 * identifier). For walk-up sessions where the shepherd doesn't use Hirsel, only
 * {@code animalName} is captured.
 *
 * <p>{@code clientLocalId} is the IndexedDB local row ID from the shearer-PWA. Set
 * on the client when first written to the local outbox, sent with the sync request,
 * and stored here so the server can dedupe replays — if the PWA retries a sync that
 * already succeeded, the second post finds a row with the same local ID and is treated
 * as idempotent.
 */
@Entity
@Table(name = "shearing_events", indexes = {
    @Index(name = "uq_shearer_localid", columnList = "shearer_user_id,client_local_id", unique = true)
})
@NullMarked
public class ShearingEventEntity {
    @Id
    @Column(name = "id", columnDefinition = "uuid")
    private UUID id;

    @Column(name = "shearer_user_id", columnDefinition = "uuid", nullable = false)
    private UUID shearerUserId;

    @Column(name = "client_local_id", length = 64) @Nullable
    private String clientLocalId;

    @Column(name = "animal_external_id", length = 128) @Nullable
    private String animalExternalId;

    @Column(name = "animal_name", nullable = false)
    private String animalName;

    @Column(name = "breed_code", length = 32) @Nullable
    private String breedCode;

    @Column(name = "fleece_weight_kg", precision = 10, scale = 2) @Nullable
    private BigDecimal fleeceWeightKg;

    @Column(name = "shorn_at", nullable = false)
    private Instant shornAt;

    @Column(name = "location") @Nullable
    private String location;

    @Column(name = "notes", columnDefinition = "text") @Nullable
    private String notes;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    protected ShearingEventEntity() {}

    public ShearingEventEntity(UUID id, UUID shearerUserId, String animalName, Instant shornAt) {
        this.id = id;
        this.shearerUserId = shearerUserId;
        this.animalName = animalName;
        this.shornAt = shornAt;
        this.createdAt = Instant.now();
    }

    public UUID getId() { return id; }
    public UUID getShearerUserId() { return shearerUserId; }
    @Nullable public String getClientLocalId() { return clientLocalId; }
    @Nullable public String getAnimalExternalId() { return animalExternalId; }
    public String getAnimalName() { return animalName; }
    @Nullable public String getBreedCode() { return breedCode; }
    @Nullable public BigDecimal getFleeceWeightKg() { return fleeceWeightKg; }
    public Instant getShornAt() { return shornAt; }
    @Nullable public String getLocation() { return location; }
    @Nullable public String getNotes() { return notes; }
    public Instant getCreatedAt() { return createdAt; }

    public void setClientLocalId(@Nullable String id) { this.clientLocalId = id; }
    public void setAnimalExternalId(@Nullable String id) { this.animalExternalId = id; }
    public void setBreedCode(@Nullable String code) { this.breedCode = code; }
    public void setFleeceWeightKg(@Nullable BigDecimal w) { this.fleeceWeightKg = w; }
    public void setLocation(@Nullable String l) { this.location = l; }
    public void setNotes(@Nullable String n) { this.notes = n; }
}
