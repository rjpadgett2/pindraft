package co.pindraft.mill_ops.domain;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import org.jspecify.annotations.NullMarked;
import org.jspecify.annotations.Nullable;

/**
 * A batched processing session on a piece of equipment. Multiple lots can pass through
 * the same equipment run together (e.g. several lots scoured in the same tub).
 *
 * <p>An open run has {@code finishedAt == null} and accepts new lot attachments.
 * Closing it sets {@code finishedAt}. Changeover events fall out of the model for free:
 * any two successive runs on the same equipment with different configurations are a
 * changeover, with cost measurable as the gap between {@code finishedAt} of the first
 * and {@code startedAt} of the second.
 */
@Entity
@Table(name = "equipment_runs")
@NullMarked
public class EquipmentRunEntity {
    @Id
    @Column(name = "id", columnDefinition = "uuid")
    private UUID id;

    @Column(name = "equipment_id", columnDefinition = "uuid", nullable = false)
    private UUID equipmentId;

    @Column(name = "started_at", nullable = false)
    private Instant startedAt;

    @Column(name = "finished_at") @Nullable
    private Instant finishedAt;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "configuration", columnDefinition = "jsonb") @Nullable
    private String configurationJson;

    @Column(name = "operator_id", columnDefinition = "uuid") @Nullable
    private UUID operatorId;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    protected EquipmentRunEntity() {}

    public EquipmentRunEntity(UUID id, UUID equipmentId, @Nullable UUID operatorId) {
        this.id = id;
        this.equipmentId = equipmentId;
        this.operatorId = operatorId;
        var now = Instant.now();
        this.startedAt = now;
        this.createdAt = now;
    }

    public UUID getId() { return id; }
    public UUID getEquipmentId() { return equipmentId; }
    public Instant getStartedAt() { return startedAt; }
    @Nullable public Instant getFinishedAt() { return finishedAt; }
    @Nullable public String getConfigurationJson() { return configurationJson; }
    @Nullable public UUID getOperatorId() { return operatorId; }
    public Instant getCreatedAt() { return createdAt; }

    public boolean isOpen() { return finishedAt == null; }

    public void close() {
        this.finishedAt = Instant.now();
    }
}
