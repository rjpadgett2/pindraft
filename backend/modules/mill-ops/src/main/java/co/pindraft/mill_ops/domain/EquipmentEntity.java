package co.pindraft.mill_ops.domain;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;
import org.jspecify.annotations.NullMarked;
import org.jspecify.annotations.Nullable;

@Entity
@Table(name = "equipment")
@NullMarked
public class EquipmentEntity {
    @Id
    @Column(name = "id", columnDefinition = "uuid")
    private UUID id;

    @Column(name = "tenant_id", columnDefinition = "uuid", nullable = false)
    private UUID tenantId;

    @Column(name = "equipment_type", nullable = false)
    private String equipmentType;

    @Column(name = "name", nullable = false)
    private String name;

    @Column(name = "workflow_stage_id", columnDefinition = "uuid")
    @Nullable
    private UUID workflowStageId;

    @Column(name = "max_weight_kg", precision = 10, scale = 2)
    @Nullable
    private BigDecimal maxWeightKg;

    @Column(name = "typical_run_minutes")
    @Nullable
    private Integer typicalRunMinutes;

    @Column(name = "active", nullable = false)
    private boolean active;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    protected EquipmentEntity() {}

    public EquipmentEntity(UUID id, UUID tenantId, String equipmentType, String name) {
        this.id = id;
        this.tenantId = tenantId;
        this.equipmentType = equipmentType;
        this.name = name;
        this.active = true;
        var now = Instant.now();
        this.createdAt = now;
        this.updatedAt = now;
    }

    public UUID getId() { return id; }
    public UUID getTenantId() { return tenantId; }
    public String getEquipmentType() { return equipmentType; }
    public String getName() { return name; }
    @Nullable public UUID getWorkflowStageId() { return workflowStageId; }
    @Nullable public BigDecimal getMaxWeightKg() { return maxWeightKg; }
    @Nullable public Integer getTypicalRunMinutes() { return typicalRunMinutes; }
    public boolean isActive() { return active; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }

    public void setName(String name) { this.name = name; touch(); }
    public void assignToStage(@Nullable UUID stageId) { this.workflowStageId = stageId; touch(); }
    public void setMaxWeightKg(@Nullable BigDecimal kg) { this.maxWeightKg = kg; touch(); }
    public void setTypicalRunMinutes(@Nullable Integer minutes) { this.typicalRunMinutes = minutes; touch(); }
    public void deactivate() { this.active = false; touch(); }

    private void touch() { this.updatedAt = Instant.now(); }
}
