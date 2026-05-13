/**
 * Pindraft shearer module — independent professional event tracking.
 *
 * <p>User-scoped only. No tenant boundary because shearers work across many farms.
 */
@org.springframework.modulith.ApplicationModule(
    displayName = "Shearer",
    allowedDependencies = { "common", "identity" }
)
package co.pindraft.shearer;
