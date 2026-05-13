package co.pindraft.mill_ops.application;

import co.pindraft.mill_ops.domain.EquipmentEntity;
import co.pindraft.mill_ops.domain.EquipmentRunEntity;
import co.pindraft.mill_ops.domain.EquipmentRunLotEntity;
import co.pindraft.mill_ops.infrastructure.EquipmentRepository;
import co.pindraft.mill_ops.infrastructure.EquipmentRunLotRepository;
import co.pindraft.mill_ops.infrastructure.EquipmentRunRepository;
import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;
import org.jspecify.annotations.Nullable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Equipment-run management. Owns the floor-batching pattern: starting a run,
 * adding lots to an existing run, closing a run.
 *
 * <p>The "find or start" pattern: when a stage transition arrives with an equipment ID,
 * we attach to the existing open run on that equipment if one exists, otherwise start
 * a new one. This is what makes batch-to-equipment scan mode flow naturally.
 */
@Service
public class EquipmentRunService {

    private final EquipmentRunRepository runs;
    private final EquipmentRunLotRepository runLots;
    private final EquipmentRepository equipment;

    public EquipmentRunService(
        EquipmentRunRepository runs,
        EquipmentRunLotRepository runLots,
        EquipmentRepository equipment
    ) {
        this.runs = runs;
        this.runLots = runLots;
        this.equipment = equipment;
    }

    public List<EquipmentRunEntity> listOpenForTenant(UUID tenantId) {
        // All open runs whose equipment belongs to this tenant
        return runs.findAllOpen().stream()
            .filter(r -> equipment.findById(r.getEquipmentId())
                .map(e -> e.getTenantId().equals(tenantId))
                .orElse(false))
            .toList();
    }

    public List<EquipmentRunLotEntity> lotsInRun(UUID runId) {
        return runLots.findByEquipmentRunId(runId);
    }

    @Transactional
    public EquipmentRunEntity findOrStartOpenRun(UUID tenantId, UUID equipmentId, @Nullable UUID operatorId) {
        var eq = equipment.findById(equipmentId)
            .orElseThrow(() -> new EquipmentNotFoundException(equipmentId));
        if (!eq.getTenantId().equals(tenantId)) {
            throw new EquipmentNotFoundException(equipmentId);
        }
        return runs.findOpenForEquipment(equipmentId)
            .orElseGet(() -> runs.save(
                new EquipmentRunEntity(UUID.randomUUID(), equipmentId, operatorId)));
    }

    @Transactional
    public EquipmentRunLotEntity attachLotToRun(UUID runId, UUID lotId, @Nullable BigDecimal weightInKg) {
        var run = runs.findById(runId).orElseThrow(() -> new EquipmentRunNotFoundException(runId));
        if (!run.isOpen()) {
            throw new EquipmentRunClosedException(runId);
        }
        var attachment = new EquipmentRunLotEntity(UUID.randomUUID(), runId, lotId, weightInKg);
        return runLots.save(attachment);
    }

    @Transactional
    public EquipmentRunEntity closeRun(UUID tenantId, UUID runId) {
        var run = runs.findById(runId).orElseThrow(() -> new EquipmentRunNotFoundException(runId));
        // Tenant check via equipment
        equipment.findById(run.getEquipmentId())
            .filter(e -> e.getTenantId().equals(tenantId))
            .orElseThrow(() -> new EquipmentRunNotFoundException(runId));
        if (!run.isOpen()) {
            return run;  // idempotent — closing a closed run is a no-op
        }
        run.close();
        return runs.save(run);
    }
}
