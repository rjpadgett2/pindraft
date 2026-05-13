package co.pindraft.mill_ops.application;

import co.pindraft.billing.PricingTemplatesQuery;
import co.pindraft.identity.domain.TenantEntity;
import co.pindraft.identity.infrastructure.TenantRepository;
import co.pindraft.mill_ops.api.SetupStatusController.SetupCategory;
import co.pindraft.mill_ops.api.SetupStatusController.SetupStatusResponse;
import co.pindraft.mill_ops.infrastructure.EquipmentRepository;
import co.pindraft.mill_ops.infrastructure.WorkflowStageRepository;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;

/**
 * Computes the onboarding hub status — a derived view over tenant configuration tables.
 *
 * <p>Reads from {@code identity} (tenant profile), local mill-ops repos (workflow stages,
 * equipment), and via published interface from {@code billing} (pricing template count).
 * The published interface pattern lets us keep module boundaries clean — mill-ops never
 * touches billing's repositories directly.
 */
@Service
public class SetupStatusService {

    private final TenantRepository tenants;
    private final WorkflowStageRepository workflowStages;
    private final EquipmentRepository equipment;
    private final PricingTemplatesQuery pricingQuery;

    public SetupStatusService(
        TenantRepository tenants,
        WorkflowStageRepository workflowStages,
        EquipmentRepository equipment,
        PricingTemplatesQuery pricingQuery
    ) {
        this.tenants = tenants;
        this.workflowStages = workflowStages;
        this.equipment = equipment;
        this.pricingQuery = pricingQuery;
    }

    public SetupStatusResponse statusFor(UUID tenantId) {
        var tenant = tenants.findById(tenantId).orElseThrow();

        var required = List.of(
            profileCategory(tenant),
            workflowStagesCategory(tenantId),
            equipmentCategory(tenantId),
            pricingCategory(tenantId)
        );
        var optional = List.of(
            new SetupCategory("operators", "Operator invitations", "NOT_STARTED",
                "Solo for now", ""),
            new SetupCategory("directory", "Directory listing", "NOT_STARTED",
                "Private by default", ""),
            new SetupCategory("printer", "Label printer", "NOT_STARTED",
                "Uses system print dialog", "")
        );

        boolean ready = required.stream().allMatch(c -> "DONE".equals(c.status()));
        return new SetupStatusResponse(tenantId, tenant.getStatus().name(), required, optional, ready);
    }

    private SetupCategory profileCategory(TenantEntity tenant) {
        return new SetupCategory(
            "profile", "Mill profile", "DONE",
            tenant.getName() + " — default units: " + tenant.getDefaultUnit(),
            ""
        );
    }

    private SetupCategory workflowStagesCategory(UUID tenantId) {
        var stages = workflowStages.findByTenantIdOrderByOrderIndex(tenantId);
        if (stages.isEmpty()) {
            return new SetupCategory(
                "workflow_stages", "Workflow stages", "NOT_STARTED",
                "No stages configured", "Add at least intake and ship-back stages"
            );
        }
        return new SetupCategory(
            "workflow_stages", "Workflow stages", "DONE",
            stages.size() + " stages configured: " +
                String.join(" → ", stages.stream().map(s -> s.getDisplayName().toLowerCase()).toList()),
            ""
        );
    }

    private SetupCategory equipmentCategory(UUID tenantId) {
        long count = equipment.countByTenantIdAndActiveTrue(tenantId);
        if (count == 0) {
            return new SetupCategory(
                "equipment", "Equipment", "NOT_STARTED",
                "No equipment configured", "Add equipment for each stage that needs it"
            );
        }
        return new SetupCategory(
            "equipment", "Equipment", "DONE",
            count + " pieces of equipment configured",
            ""
        );
    }

    private SetupCategory pricingCategory(UUID tenantId) {
        long count = pricingQuery.countActiveForTenant(tenantId);
        if (count == 0) {
            return new SetupCategory(
                "pricing", "Pricing templates", "NOT_STARTED",
                "No pricing templates yet", "Lots can't be invoiced without at least one"
            );
        }
        return new SetupCategory(
            "pricing", "Pricing templates", "DONE",
            count + " template" + (count == 1 ? "" : "s") + " configured",
            ""
        );
    }
}
