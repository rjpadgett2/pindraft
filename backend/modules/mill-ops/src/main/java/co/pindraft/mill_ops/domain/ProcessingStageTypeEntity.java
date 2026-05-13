package co.pindraft.mill_ops.domain;

import jakarta.persistence.*;
import org.jspecify.annotations.NullMarked;

/**
 * Platform-shared canonical stage taxonomy — INTAKE, SCOUR, CARD, SPIN, etc.
 * Read-only; rows are seeded by the V2 migration.
 */
@Entity
@Table(name = "processing_stage_types")
@NullMarked
public class ProcessingStageTypeEntity {
    @Id
    @Column(name = "code", length = 32)
    private String code;

    @Column(name = "name", nullable = false, length = 64)
    private String name;

    @Column(name = "description", nullable = false, columnDefinition = "text")
    private String description;

    @Column(name = "typical_order", nullable = false)
    private int typicalOrder;

    protected ProcessingStageTypeEntity() {}

    public String getCode() { return code; }
    public String getName() { return name; }
    public String getDescription() { return description; }
    public int getTypicalOrder() { return typicalOrder; }
}
