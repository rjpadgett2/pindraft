package co.pindraft.mill_ops.domain;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;
import org.jspecify.annotations.NullMarked;
import org.jspecify.annotations.Nullable;

/**
 * A single fleece record attached to a lot at intake. Transitioned from user-scope
 * (shepherd's pre-shipment fleece) into tenant-scope at the intake transaction.
 *
 * <p>{@code externalFleeceId} preserves the source system's identifier (e.g. Hirsel's
 * fleece UUID) so webhooks back to that system can reference the original record.
 */
@Entity
@Table(name = "intake_fleeces")
@NullMarked
public class IntakeFleeceEntity {
    @Id
    @Column(name = "id", columnDefinition = "uuid")
    private UUID id;

    @Column(name = "lot_id", columnDefinition = "uuid", nullable = false)
    private UUID lotId;

    @Column(name = "external_fleece_id") @Nullable
    private String externalFleeceId;

    @Column(name = "source_animal_name") @Nullable
    private String sourceAnimalName;

    @Column(name = "source_animal_id") @Nullable
    private String sourceAnimalId;

    @Column(name = "breed_code", length = 32) @Nullable
    private String breedCode;

    @Column(name = "weight_kg", nullable = false, precision = 10, scale = 2)
    private BigDecimal weightKg;

    @Column(name = "notes", columnDefinition = "text") @Nullable
    private String notes;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    protected IntakeFleeceEntity() {}

    public IntakeFleeceEntity(UUID id, UUID lotId, BigDecimal weightKg, @Nullable String sourceAnimalName) {
        this.id = id;
        this.lotId = lotId;
        this.weightKg = weightKg;
        this.sourceAnimalName = sourceAnimalName;
        this.createdAt = Instant.now();
    }

    public UUID getId() { return id; }
    public UUID getLotId() { return lotId; }
    @Nullable public String getExternalFleeceId() { return externalFleeceId; }
    @Nullable public String getSourceAnimalName() { return sourceAnimalName; }
    @Nullable public String getSourceAnimalId() { return sourceAnimalId; }
    @Nullable public String getBreedCode() { return breedCode; }
    public BigDecimal getWeightKg() { return weightKg; }
    @Nullable public String getNotes() { return notes; }
    public Instant getCreatedAt() { return createdAt; }

    public void setNotes(@Nullable String notes) { this.notes = notes; }
    public void setBreedCode(@Nullable String breedCode) { this.breedCode = breedCode; }
}
