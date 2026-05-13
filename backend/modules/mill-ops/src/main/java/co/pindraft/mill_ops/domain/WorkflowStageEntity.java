package co.pindraft.mill_ops.domain;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;
import org.jspecify.annotations.NullMarked;

@Entity
@Table(name = "workflow_stages",
    uniqueConstraints = @UniqueConstraint(columnNames = {"tenant_id", "order_index"}))
@NullMarked
public class WorkflowStageEntity {
    @Id
    @Column(name = "id", columnDefinition = "uuid")
    private UUID id;

    @Column(name = "tenant_id", columnDefinition = "uuid", nullable = false)
    private UUID tenantId;

    @Column(name = "stage_type", nullable = false)
    private String stageType;  // FK to platform-shared processing_stage_types.code

    @Column(name = "display_name", nullable = false)
    private String displayName;

    @Column(name = "order_index", nullable = false)
    private int orderIndex;

    @Column(name = "requires_equipment", nullable = false)
    private boolean requiresEquipment;

    @Column(name = "tenant_custom", nullable = false)
    private boolean tenantCustom;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    protected WorkflowStageEntity() {}

    public WorkflowStageEntity(UUID id, UUID tenantId, String stageType,
                               String displayName, int orderIndex, boolean requiresEquipment) {
        this.id = id;
        this.tenantId = tenantId;
        this.stageType = stageType;
        this.displayName = displayName;
        this.orderIndex = orderIndex;
        this.requiresEquipment = requiresEquipment;
        this.tenantCustom = false;
        var now = Instant.now();
        this.createdAt = now;
        this.updatedAt = now;
    }

    public UUID getId() { return id; }
    public UUID getTenantId() { return tenantId; }
    public String getStageType() { return stageType; }
    public String getDisplayName() { return displayName; }
    public int getOrderIndex() { return orderIndex; }
    public boolean isRequiresEquipment() { return requiresEquipment; }
    public boolean isTenantCustom() { return tenantCustom; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }

    public void setDisplayName(String displayName) {
        this.displayName = displayName;
        this.updatedAt = Instant.now();
    }

    public void setOrderIndex(int orderIndex) {
        this.orderIndex = orderIndex;
        this.updatedAt = Instant.now();
    }
}
