package co.pindraft.mill_ops.domain;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.util.UUID;
import org.jspecify.annotations.NullMarked;
import org.jspecify.annotations.Nullable;

@Entity
@Table(name = "equipment_run_lots")
@NullMarked
public class EquipmentRunLotEntity {
    @Id
    @Column(name = "id", columnDefinition = "uuid")
    private UUID id;

    @Column(name = "equipment_run_id", columnDefinition = "uuid", nullable = false)
    private UUID equipmentRunId;

    @Column(name = "lot_id", columnDefinition = "uuid", nullable = false)
    private UUID lotId;

    @Column(name = "weight_in_kg", precision = 10, scale = 2) @Nullable
    private BigDecimal weightInKg;

    @Column(name = "weight_out_kg", precision = 10, scale = 2) @Nullable
    private BigDecimal weightOutKg;

    protected EquipmentRunLotEntity() {}

    public EquipmentRunLotEntity(UUID id, UUID equipmentRunId, UUID lotId, @Nullable BigDecimal weightInKg) {
        this.id = id;
        this.equipmentRunId = equipmentRunId;
        this.lotId = lotId;
        this.weightInKg = weightInKg;
    }

    public UUID getId() { return id; }
    public UUID getEquipmentRunId() { return equipmentRunId; }
    public UUID getLotId() { return lotId; }
    @Nullable public BigDecimal getWeightInKg() { return weightInKg; }
    @Nullable public BigDecimal getWeightOutKg() { return weightOutKg; }
}
