package co.pindraft.traceability.application;

import co.pindraft.traceability.TraceEmitter;
import co.pindraft.traceability.domain.TraceRecordEntity;
import co.pindraft.traceability.domain.TraceSegmentEntity;
import co.pindraft.traceability.infrastructure.TraceRecordRepository;
import co.pindraft.traceability.infrastructure.TraceSegmentRepository;
import java.math.BigDecimal;
import java.security.SecureRandom;
import java.util.List;
import java.util.UUID;
import org.jspecify.annotations.NullMarked;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * The trace lifecycle service. Implements {@link TraceEmitter} for other modules
 * to call, plus exposes read methods for the public lookup and visibility toggle.
 *
 * <p>Slugs are 6 characters from a confusable-free alphabet (no 0/O, 1/l/I).
 * 6 chars from 32 symbols = 1 billion possible slugs, more than enough for
 * any small-mill operation. Collisions are checked and retried.
 */
@Service
@NullMarked
public class TraceService implements TraceEmitter {

    /** Confusable-free base32 alphabet (Crockford's). Excludes I, L, O, U. */
    private static final String SLUG_ALPHABET = "23456789ABCDEFGHJKMNPQRSTVWXYZ";
    private static final int SLUG_LENGTH = 6;
    private static final SecureRandom RANDOM = new SecureRandom();

    private final TraceRecordRepository records;
    private final TraceSegmentRepository segments;

    public TraceService(TraceRecordRepository records, TraceSegmentRepository segments) {
        this.records = records;
        this.segments = segments;
    }

    // ---- TraceEmitter implementation ----

    @Override
    @Transactional
    public String emitIntake(IntakeData data) {
        // Idempotency: if a trace record exists for this lot, return its existing slug.
        var existing = records.findByLotId(data.lotId());
        if (existing.isPresent()) return existing.get().getSlug();

        var slug = generateUniqueSlug();
        var record = new TraceRecordEntity(
            UUID.randomUUID(), data.lotId(), slug,
            data.customerDisplayName(), data.intakeWeightKg());
        records.save(record);

        // Open the INTAKE segment
        var firstSegment = new TraceSegmentEntity(
            UUID.randomUUID(), record.getId(), "INTAKE", data.intakeWeightKg());
        segments.save(firstSegment);

        return slug;
    }

    @Override
    @Transactional
    public void emitStageTransition(UUID lotId, String newStageType, BigDecimal weightOutKg) {
        var record = records.findByLotId(lotId).orElse(null);
        if (record == null) return;  // no trace record means intake never emitted — skip gracefully

        // Close the open segment, if any
        segments.findOpenForRecord(record.getId()).ifPresent(open -> {
            open.close(weightOutKg);
            segments.save(open);
        });

        // Open a new segment for the destination stage. The weight_in of the new segment
        // equals the weight_out of the segment that just closed — the chain is preserved.
        var newSegment = new TraceSegmentEntity(
            UUID.randomUUID(), record.getId(), newStageType, weightOutKg);
        segments.save(newSegment);
    }

    // ---- Read methods ----

    public TraceRecordEntity getBySlugIfPublic(String slug) {
        var record = records.findBySlug(slug).orElseThrow(() -> new TraceNotFoundException(slug));
        if (!record.isPublicVisible()) {
            // Don't distinguish between "doesn't exist" and "exists but not public" externally
            throw new TraceNotFoundException(slug);
        }
        return record;
    }

    public TraceRecordEntity getForLot(UUID lotId) {
        return records.findByLotId(lotId).orElseThrow(() -> new TraceNotFoundException(lotId.toString()));
    }

    public List<TraceSegmentEntity> segmentsForRecord(UUID recordId) {
        return segments.findByTraceRecordIdOrderByEnteredAt(recordId);
    }

    // ---- Visibility ----

    @Transactional
    public TraceRecordEntity setVisibility(UUID lotId, boolean visible) {
        var record = records.findByLotId(lotId).orElseThrow(() -> new TraceNotFoundException(lotId.toString()));
        record.setPublicVisible(visible);
        return records.save(record);
    }

    // ---- Internals ----

    String generateUniqueSlug() {
        // Try up to 10 times before giving up — 30^6 = 729M possibilities, collisions essentially impossible
        for (int attempt = 0; attempt < 10; attempt++) {
            var slug = randomSlug();
            if (!records.existsBySlug(slug)) return slug;
        }
        throw new IllegalStateException("Could not generate unique slug after 10 attempts");
    }

    private String randomSlug() {
        var sb = new StringBuilder(SLUG_LENGTH);
        for (int i = 0; i < SLUG_LENGTH; i++) {
            sb.append(SLUG_ALPHABET.charAt(RANDOM.nextInt(SLUG_ALPHABET.length())));
        }
        return sb.toString();
    }
}
