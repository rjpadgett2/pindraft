package co.pindraft.mill_ops.application;

import co.pindraft.mill_ops.domain.LotEntity;
import co.pindraft.mill_ops.domain.LotStageEventEntity;
import co.pindraft.mill_ops.infrastructure.IntakeFleeceRepository;
import co.pindraft.mill_ops.infrastructure.LotRepository;
import co.pindraft.mill_ops.infrastructure.LotStageEventRepository;
import co.pindraft.mill_ops.infrastructure.WorkflowStageRepository;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.jspecify.annotations.Nullable;
import org.springframework.stereotype.Service;

/**
 * Read-only queue projections — derived from open stage events per the spec
 * (the queue is derivable, not its own canonical store).
 */
@Service
public class QueueService {

    private final LotStageEventRepository stageEvents;
    private final LotRepository lots;
    private final WorkflowStageRepository workflowStages;
    private final IntakeFleeceRepository intakeFleeces;

    public QueueService(
        LotStageEventRepository stageEvents,
        LotRepository lots,
        WorkflowStageRepository workflowStages,
        IntakeFleeceRepository intakeFleeces
    ) {
        this.stageEvents = stageEvents;
        this.lots = lots;
        this.workflowStages = workflowStages;
        this.intakeFleeces = intakeFleeces;
    }

    /**
     * Lots currently waiting at a given stage, longest-dwell-first.
     */
    public List<QueueEntry> queueForStage(UUID tenantId, UUID stageId) {
        workflowStages.findById(stageId)
            .filter(s -> s.getTenantId().equals(tenantId))
            .orElseThrow(() -> new WorkflowStageNotFoundException(stageId));

        var openEvents = stageEvents.findOpenAtStage(stageId);
        var now = Instant.now();

        return openEvents.stream()
            .map(e -> toEntry(e, now))
            .sorted((a, b) -> Long.compare(b.dwellSeconds(), a.dwellSeconds()))
            .toList();
    }

    /**
     * Per-stage queue summary across all workflow stages for the tenant.
     * For the operator's queue overview screen.
     */
    public List<StageQueueSummary> summariesForTenant(UUID tenantId) {
        var stages = workflowStages.findByTenantIdOrderByOrderIndex(tenantId);
        return stages.stream()
            .map(s -> new StageQueueSummary(
                s.getId(),
                s.getDisplayName(),
                s.getStageType(),
                s.getOrderIndex(),
                stageEvents.findOpenAtStage(s.getId()).size()))
            .toList();
    }

    /**
     * Queue-and-changeover optimizer proposal. v1 algorithm: group lots by primary
     * breed (the most common breed_code across the lot's intake fleeces); within
     * each group sort by dwell time (longest-waiting first); order groups by the
     * longest dwell in the group so no group gets starved. Minimizes equipment
     * changeovers while honoring FIFO fairness — operator can override.
     *
     * <p>The proposal is non-binding. Spec calls for proposals to be logged for
     * audit but operator action remains canonical. Logging hook is a follow-up
     * once a {@code optimizer_proposals} table is designed.
     */
    public List<OptimizerEntry> proposeSequenceForStage(UUID tenantId, UUID stageId) {
        workflowStages.findById(stageId)
            .filter(s -> s.getTenantId().equals(tenantId))
            .orElseThrow(() -> new WorkflowStageNotFoundException(stageId));

        var openEvents = stageEvents.findOpenAtStage(stageId);
        if (openEvents.isEmpty()) return List.of();

        var now = Instant.now();
        record Candidate(LotStageEventEntity event, LotEntity lot, String primaryBreed, long dwellSeconds) {}

        var candidates = new ArrayList<Candidate>();
        for (var e : openEvents) {
            var lot = lots.findById(e.getLotId()).orElse(null);
            if (lot == null) continue;
            var primaryBreed = primaryBreedFor(lot.getId());
            candidates.add(new Candidate(e, lot,
                primaryBreed == null ? "MIXED" : primaryBreed,
                Duration.between(e.getEnteredAt(), now).getSeconds()));
        }

        var grouped = new LinkedHashMap<String, List<Candidate>>();
        for (var c : candidates) {
            grouped.computeIfAbsent(c.primaryBreed(), k -> new ArrayList<>()).add(c);
        }
        grouped.values().forEach(g -> g.sort(Comparator.comparingLong(Candidate::dwellSeconds).reversed()));

        var groupOrder = grouped.entrySet().stream()
            .sorted(Comparator.<Map.Entry<String, List<Candidate>>>comparingLong(
                e -> e.getValue().stream().mapToLong(Candidate::dwellSeconds).max().orElse(0)
            ).reversed())
            .toList();

        var result = new ArrayList<OptimizerEntry>();
        int position = 1;
        String prevBreed = null;
        for (var group : groupOrder) {
            var groupBreed = group.getKey();
            var groupLots = group.getValue();
            for (int i = 0; i < groupLots.size(); i++) {
                var c = groupLots.get(i);
                String reasoning;
                if (i == 0 && !groupBreed.equals(prevBreed)) {
                    reasoning = position == 1
                        ? "Longest dwell at this stage (" + groupBreed + ")"
                        : "Changeover to " + groupBreed + " — group has longest-waiting remaining lot";
                } else {
                    reasoning = "Same-breed batch (" + groupBreed + ") — no changeover";
                }
                result.add(new OptimizerEntry(
                    position++, c.lot().getId(), c.lot().getCustomerId(),
                    c.lot().getWeightIntakeKg(), c.event().getEnteredAt(),
                    c.dwellSeconds(), groupBreed, reasoning));
                prevBreed = groupBreed;
            }
        }
        return result;
    }

    @Nullable
    private String primaryBreedFor(UUID lotId) {
        var fleeces = intakeFleeces.findByLotId(lotId);
        if (fleeces.isEmpty()) return null;
        var counts = new HashMap<String, Long>();
        for (var f : fleeces) {
            var b = f.getBreedCode();
            if (b != null && !b.isBlank()) counts.merge(b, 1L, Long::sum);
        }
        if (counts.isEmpty()) return null;
        return counts.entrySet().stream()
            .max(Map.Entry.comparingByValue())
            .map(Map.Entry::getKey)
            .orElse(null);
    }

    private QueueEntry toEntry(LotStageEventEntity event, Instant now) {
        var lot = lots.findById(event.getLotId()).orElseThrow();
        var dwellSeconds = Duration.between(event.getEnteredAt(), now).getSeconds();
        return new QueueEntry(
            lot.getId(),
            lot.getCustomerId(),
            lot.getWeightIntakeKg(),
            event.getEnteredAt(),
            event.getWeightInKg(),
            dwellSeconds);
    }

    public record QueueEntry(
        UUID lotId, UUID customerId, java.math.BigDecimal weightIntakeKg,
        Instant enteredAt, java.math.BigDecimal weightInKg, long dwellSeconds) {}

    public record StageQueueSummary(
        UUID stageId, String displayName, String stageType, int orderIndex, int waitingCount) {}

    public record OptimizerEntry(
        int proposedPosition,
        UUID lotId,
        UUID customerId,
        java.math.BigDecimal weightIntakeKg,
        Instant enteredAt,
        long dwellSeconds,
        String groupKey,
        String reasoning
    ) {}
}
