package co.pindraft.mill_ops.application;

import co.pindraft.mill_ops.domain.EquipmentEntity;
import co.pindraft.mill_ops.infrastructure.EquipmentRepository;
import co.pindraft.mill_ops.infrastructure.EquipmentTypeRepository;
import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class EquipmentService {

    private final EquipmentRepository equipment;
    private final EquipmentTypeRepository equipmentTypes;

    public EquipmentService(EquipmentRepository equipment, EquipmentTypeRepository equipmentTypes) {
        this.equipment = equipment;
        this.equipmentTypes = equipmentTypes;
    }

    public List<EquipmentEntity> listForTenant(UUID tenantId) {
        return equipment.findByTenantIdAndActiveTrueOrderByName(tenantId);
    }

    @Transactional
    public EquipmentEntity create(
        UUID tenantId, String equipmentType, String name,
        UUID workflowStageId, BigDecimal maxWeightKg, Integer typicalRunMinutes
    ) {
        if (!equipmentTypes.existsById(equipmentType)) {
            throw new UnknownEquipmentTypeException(equipmentType);
        }
        var e = new EquipmentEntity(UUID.randomUUID(), tenantId, equipmentType, name);
        if (workflowStageId != null) e.assignToStage(workflowStageId);
        if (maxWeightKg != null) e.setMaxWeightKg(maxWeightKg);
        if (typicalRunMinutes != null) e.setTypicalRunMinutes(typicalRunMinutes);
        return equipment.save(e);
    }

    @Transactional
    public void deactivate(UUID tenantId, UUID equipmentId) {
        var e = equipment.findById(equipmentId).orElseThrow(() -> new EquipmentNotFoundException(equipmentId));
        if (!e.getTenantId().equals(tenantId)) {
            throw new EquipmentNotFoundException(equipmentId);
        }
        e.deactivate();
        equipment.save(e);
    }
}
