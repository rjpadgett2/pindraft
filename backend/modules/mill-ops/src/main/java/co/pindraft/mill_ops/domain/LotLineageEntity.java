package co.pindraft.mill_ops.domain;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;
import org.jspecify.annotations.NullMarked;

/**
 * One row per parent/child edge in the lot lineage DAG. The DAG powers the trace
 * record: provenance walks parent_lot_id backwards from finished product to source.
 */
@Entity
@Table(name = "lot_lineage_links")
@NullMarked
public class LotLineageEntity {
    @Id
    @Column(name = "id", columnDefinition = "uuid")
    private UUID id;

    @Column(name = "parent_lot_id", columnDefinition = "uuid", nullable = false)
    private UUID parentLotId;

    @Column(name = "child_lot_id", columnDefinition = "uuid", nullable = false)
    private UUID childLotId;

    @Enumerated(EnumType.STRING)
    @Column(name = "transition_kind", nullable = false, length = 32)
    private LotLineageTransition transitionKind;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    protected LotLineageEntity() {}

    public LotLineageEntity(UUID id, UUID parentLotId, UUID childLotId,
                            LotLineageTransition transitionKind) {
        this.id = id;
        this.parentLotId = parentLotId;
        this.childLotId = childLotId;
        this.transitionKind = transitionKind;
        this.createdAt = Instant.now();
    }

    public UUID getId() { return id; }
    public UUID getParentLotId() { return parentLotId; }
    public UUID getChildLotId() { return childLotId; }
    public LotLineageTransition getTransitionKind() { return transitionKind; }
    public Instant getCreatedAt() { return createdAt; }
}
