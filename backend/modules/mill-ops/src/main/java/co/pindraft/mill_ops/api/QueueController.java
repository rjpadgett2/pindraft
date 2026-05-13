package co.pindraft.mill_ops.api;

import co.pindraft.common.security.TenantAccessGuard;
import co.pindraft.mill_ops.application.QueueService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.List;
import java.util.UUID;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/tenants/{tenantId}/queues")
@Tag(name = "Operations", description = "Stage queue views")
public class QueueController {

    private final QueueService service;
    private final TenantAccessGuard accessGuard;

    public QueueController(QueueService service, TenantAccessGuard accessGuard) {
        this.service = service;
        this.accessGuard = accessGuard;
    }

    @GetMapping
    @Operation(summary = "Per-stage queue summary (counts) across all workflow stages")
    public List<QueueService.StageQueueSummary> summaries(@PathVariable UUID tenantId) {
        accessGuard.requireStaffAccess(tenantId);
        return service.summariesForTenant(tenantId);
    }

    @GetMapping("/{stageId}")
    @Operation(summary = "Lots currently waiting at a stage, longest dwell first")
    public List<QueueService.QueueEntry> queueForStage(
        @PathVariable UUID tenantId, @PathVariable UUID stageId
    ) {
        accessGuard.requireStaffAccess(tenantId);
        return service.queueForStage(tenantId, stageId);
    }

    @GetMapping("/{stageId}/optimizer-proposal")
    @Operation(summary = "Non-binding proposed sequence for a stage's queue. Groups by primary breed to minimize equipment changeovers; orders groups by longest-dwell-first to avoid starvation. Operator action is canonical.")
    public List<QueueService.OptimizerEntry> optimizerProposal(
        @PathVariable UUID tenantId, @PathVariable UUID stageId
    ) {
        accessGuard.requireStaffAccess(tenantId);
        return service.proposeSequenceForStage(tenantId, stageId);
    }
}
