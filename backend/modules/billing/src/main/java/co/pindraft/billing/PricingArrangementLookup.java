package co.pindraft.billing;

import java.util.Optional;
import java.util.UUID;

/**
 * Published interface used by other modules (mill-ops) to read pricing arrangements for
 * snapshot-at-decision-moment. Returns the arrangement's kind and serialized config so
 * the caller can store the snapshot.
 */
public interface PricingArrangementLookup {
    Optional<Snapshot> snapshot(UUID arrangementId);

    record Snapshot(UUID id, String name, String kind, String configJson) {}
}
