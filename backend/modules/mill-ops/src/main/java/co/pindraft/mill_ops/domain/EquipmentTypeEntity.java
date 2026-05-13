package co.pindraft.mill_ops.domain;

import jakarta.persistence.*;
import org.jspecify.annotations.NullMarked;
import org.jspecify.annotations.Nullable;

@Entity
@Table(name = "equipment_types")
@NullMarked
public class EquipmentTypeEntity {
    @Id
    @Column(name = "code", length = 32)
    private String code;

    @Column(name = "name", nullable = false, length = 64)
    private String name;

    @Column(name = "description", nullable = false, columnDefinition = "text")
    private String description;

    @Column(name = "stage_code", length = 32)
    @Nullable
    private String stageCode;

    protected EquipmentTypeEntity() {}

    public String getCode() { return code; }
    public String getName() { return name; }
    public String getDescription() { return description; }
    @Nullable public String getStageCode() { return stageCode; }
}
