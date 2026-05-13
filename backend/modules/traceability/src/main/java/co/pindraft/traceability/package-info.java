/**
 * Pindraft traceability module — trace records and segments.
 *
 * <p>Publishes {@link co.pindraft.traceability.TraceEmitter} for other modules
 * to call from inside their domain transactions.
 */
@org.springframework.modulith.ApplicationModule(
    displayName = "Traceability",
    allowedDependencies = { "common", "identity" }
)
package co.pindraft.traceability;
