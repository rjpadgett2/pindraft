package co.pindraft.mill_ops.domain;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import org.jspecify.annotations.NullMarked;
import org.jspecify.annotations.Nullable;

/**
 * A fiber test result attached to a specific lot. The spec mentions FibreLux and
 * OFDA2000 as the most common instruments — instrument name is freeform so any new
 * lab adds without a schema change.
 *
 * <p>{@code resultNumeric} is the headline value (e.g. mean micron diameter in µm);
 * {@code resultJson} carries instrument-specific extra data (full distribution
 * curves from OFDA2000, comfort-factor breakdown, etc.).
 */
@Entity
@Table(name = "fiber_tests")
@NullMarked
public class FiberTestEntity {
    @Id
    @Column(name = "id", columnDefinition = "uuid")
    private UUID id;

    @Column(name = "lot_id", columnDefinition = "uuid", nullable = false)
    private UUID lotId;

    @Enumerated(EnumType.STRING)
    @Column(name = "test_type", nullable = false, length = 32)
    private FiberTestType testType;

    @Column(name = "instrument", length = 64) @Nullable
    private String instrument;

    @Column(name = "result_numeric", precision = 10, scale = 4) @Nullable
    private BigDecimal resultNumeric;

    @Column(name = "result_unit", length = 16) @Nullable
    private String resultUnit;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "result_json", columnDefinition = "jsonb") @Nullable
    private String resultJson;

    @Column(name = "tested_at", nullable = false)
    private Instant testedAt;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    protected FiberTestEntity() {}

    public FiberTestEntity(UUID id, UUID lotId, FiberTestType testType, Instant testedAt) {
        this.id = id;
        this.lotId = lotId;
        this.testType = testType;
        this.testedAt = testedAt;
        this.createdAt = Instant.now();
    }

    public void setInstrument(@Nullable String instrument) { this.instrument = instrument; }
    public void setResultNumeric(@Nullable BigDecimal resultNumeric) { this.resultNumeric = resultNumeric; }
    public void setResultUnit(@Nullable String resultUnit) { this.resultUnit = resultUnit; }
    public void setResultJson(@Nullable String resultJson) { this.resultJson = resultJson; }

    public UUID getId() { return id; }
    public UUID getLotId() { return lotId; }
    public FiberTestType getTestType() { return testType; }
    @Nullable public String getInstrument() { return instrument; }
    @Nullable public BigDecimal getResultNumeric() { return resultNumeric; }
    @Nullable public String getResultUnit() { return resultUnit; }
    @Nullable public String getResultJson() { return resultJson; }
    public Instant getTestedAt() { return testedAt; }
    public Instant getCreatedAt() { return createdAt; }
}
