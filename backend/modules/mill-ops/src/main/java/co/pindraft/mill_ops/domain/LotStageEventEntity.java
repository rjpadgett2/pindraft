package co.pindraft.mill_ops.domain;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;
import org.jspecify.annotations.NullMarked;
import org.jspecify.annotations.Nullable;

/**
 * Journal entry for a stage transition on a lot. Open events have {@code exitedAt == null};
 * closing the event sets exitedAt and weightOut.
 */
@Entity
@Table(name = "lot_stage_events")
@NullMarked
public class LotStageEventEntity {
    @Id
    @Column(name = "id", columnDefinition = "uuid")
    private UUID id;

    @Column(name = "lot_id", columnDefinition = "uuid", nullable = false)
    private UUID lotId;

    @Column(name = "workflow_stage_id", columnDefinition = "uuid", nullable = false)
    private UUID workflowStageId;

    @Column(name = "entered_at", nullable = false)
    private Instant enteredAt;

    @Column(name = "exited_at") @Nullable
    private Instant exitedAt;

    @Column(name = "weight_in_kg", precision = 10, scale = 2) @Nullable
    private BigDecimal weightInKg;

    @Column(name = "weight_out_kg", precision = 10, scale = 2) @Nullable
    private BigDecimal weightOutKg;

    @Column(name = "actor_user_id", columnDefinition = "uuid") @Nullable
    private UUID actorUserId;

    @Column(name = "notes", columnDefinition = "text") @Nullable
    private String notes;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    protected LotStageEventEntity() {}

    public LotStageEventEntity(UUID id, UUID lotId, UUID workflowStageId,
                                @Nullable BigDecimal weightInKg, @Nullable UUID actorUserId) {
        this.id = id;
        this.lotId = lotId;
        this.workflowStageId = workflowStageId;
        this.enteredAt = Instant.now();
        this.weightInKg = weightInKg;
        this.actorUserId = actorUserId;
        this.createdAt = Instant.now();
    }

    public UUID getId() { return id; }
    public UUID getLotId() { return lotId; }
    public UUID getWorkflowStageId() { return workflowStageId; }
    public Instant getEnteredAt() { return enteredAt; }
    @Nullable public Instant getExitedAt() { return exitedAt; }
    @Nullable public BigDecimal getWeightInKg() { return weightInKg; }
    @Nullable public BigDecimal getWeightOutKg() { return weightOutKg; }
    @Nullable public UUID getActorUserId() { return actorUserId; }
    @Nullable public String getNotes() { return notes; }
    public Instant getCreatedAt() { return createdAt; }

    public void close(BigDecimal weightOutKg) {
        this.exitedAt = Instant.now();
        this.weightOutKg = weightOutKg;
    }
}
