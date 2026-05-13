/**
 * Pindraft marketplace module — public listings, mill directory, browsing surfaces.
 *
 * <p>Listings are tenant-scoped at write time, published to the public-shared layer
 * at publish time. Mill directory is a read projection over identity's tenants
 * table, filtered to LIVE status.
 */
@org.springframework.modulith.ApplicationModule(
    displayName = "Marketplace",
    allowedDependencies = { "common", "identity" }
)
package co.pindraft.marketplace;
