package co.pindraft.traceability.domain;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;
import org.jspecify.annotations.NullMarked;
import org.jspecify.annotations.Nullable;

/**
 * One segment per stage entered on a lot's journey. Open segments have
 * {@code exitedAt == null}. Stage type is the canonical platform taxonomy
 * (INTAKE, SCOUR, CARD, etc.) — not the tenant's display name — because the
 * public trace is read by people who don't know any mill's local vocabulary.
 */
@Entity
@Table(name = "trace_segments")
@NullMarked
public class TraceSegmentEntity {
    @Id
    @Column(name = "id", columnDefinition = "uuid")
    private UUID id;

    @Column(name = "trace_record_id", columnDefinition = "uuid", nullable = false)
    private UUID traceRecordId;

    @Column(name = "stage_type", nullable = false, length = 32)
    private String stageType;

    @Column(name = "entered_at", nullable = false)
    private Instant enteredAt;

    @Column(name = "exited_at") @Nullable
    private Instant exitedAt;

    @Column(name = "weight_in_kg", precision = 10, scale = 2) @Nullable
    private BigDecimal weightInKg;

    @Column(name = "weight_out_kg", precision = 10, scale = 2) @Nullable
    private BigDecimal weightOutKg;

    protected TraceSegmentEntity() {}

    public TraceSegmentEntity(UUID id, UUID traceRecordId, String stageType,
                               @Nullable BigDecimal weightInKg) {
        this.id = id;
        this.traceRecordId = traceRecordId;
        this.stageType = stageType;
        this.weightInKg = weightInKg;
        this.enteredAt = Instant.now();
    }

    public UUID getId() { return id; }
    public UUID getTraceRecordId() { return traceRecordId; }
    public String getStageType() { return stageType; }
    public Instant getEnteredAt() { return enteredAt; }
    @Nullable public Instant getExitedAt() { return exitedAt; }
    @Nullable public BigDecimal getWeightInKg() { return weightInKg; }
    @Nullable public BigDecimal getWeightOutKg() { return weightOutKg; }

    public boolean isOpen() { return exitedAt == null; }

    public void close(@Nullable BigDecimal weightOutKg) {
        this.exitedAt = Instant.now();
        this.weightOutKg = weightOutKg;
    }
}
