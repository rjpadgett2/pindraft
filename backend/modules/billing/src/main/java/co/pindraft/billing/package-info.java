/**
 * Pindraft billing module — pricing templates, invoicing, settlements.
 */
@org.springframework.modulith.ApplicationModule(
    displayName = "Billing",
    allowedDependencies = { "common", "identity" }
)
package co.pindraft.billing;
