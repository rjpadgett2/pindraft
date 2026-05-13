package co.pindraft.mill_ops.domain;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;
import org.jspecify.annotations.NullMarked;
import org.jspecify.annotations.Nullable;

/**
 * Every QR scan event. Stage transitions are scans with {@code scan_kind = STAGE_TRANSITION}
 * and trigger the open/close of {@link LotStageEventEntity} rows. Other kinds
 * (NOTE, ISSUE, LOCATION_UPDATE, WEIGHT_CHECK) just log without changing state.
 */
@Entity
@Table(name = "scan_events")
@NullMarked
public class ScanEventEntity {
    @Id
    @Column(name = "id", columnDefinition = "uuid")
    private UUID id;

    @Column(name = "lot_id", columnDefinition = "uuid", nullable = false)
    private UUID lotId;

    @Column(name = "actor_user_id", columnDefinition = "uuid") @Nullable
    private UUID actorUserId;

    @Column(name = "scan_kind", nullable = false, length = 32)
    private String scanKind;

    @Column(name = "scanned_at", nullable = false)
    private Instant scannedAt;

    @Column(name = "notes", columnDefinition = "text") @Nullable
    private String notes;

    protected ScanEventEntity() {}

    public ScanEventEntity(UUID id, UUID lotId, @Nullable UUID actorUserId,
                           String scanKind, @Nullable String notes) {
        this.id = id;
        this.lotId = lotId;
        this.actorUserId = actorUserId;
        this.scanKind = scanKind;
        this.notes = notes;
        this.scannedAt = Instant.now();
    }

    public UUID getId() { return id; }
    public UUID getLotId() { return lotId; }
    @Nullable public UUID getActorUserId() { return actorUserId; }
    public String getScanKind() { return scanKind; }
    public Instant getScannedAt() { return scannedAt; }
    @Nullable public String getNotes() { return notes; }
}
