/**
 * Pindraft mill-ops module — lots, batches, stages, equipment.
 */
@org.springframework.modulith.ApplicationModule(
    displayName = "Mill Operations",
    allowedDependencies = { "common", "identity", "billing", "traceability", "pools" }
)
package co.pindraft.mill_ops;
