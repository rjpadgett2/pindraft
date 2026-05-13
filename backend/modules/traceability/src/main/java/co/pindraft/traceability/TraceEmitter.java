package co.pindraft.traceability;

import java.math.BigDecimal;
import java.util.UUID;

/**
 * Published interface for emitting trace events from other modules.
 *
 * <p>Other modules call this from inside their domain transactions to record events
 * onto a lot's trace. The emitter is idempotent on (lotId, event) where it makes sense
 * — re-emitting an intake for the same lot returns the existing slug rather than
 * creating a second record.
 */
public interface TraceEmitter {

    /**
     * Record an intake event. Creates the trace record (with a fresh slug, visibility off)
     * and opens the INTAKE segment. Returns the slug.
     */
    String emitIntake(IntakeData data);

    /**
     * Record a stage transition. Closes the lot's current open segment with the given
     * exit weight, then opens a new segment for the destination stage.
     */
    void emitStageTransition(UUID lotId, String newStageType, BigDecimal weightOutKg);

    record IntakeData(UUID lotId, String customerDisplayName, BigDecimal intakeWeightKg) {}
}
