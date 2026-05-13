package co.pindraft.billing;

import java.util.UUID;

/**
 * Published interface used by other modules (mill-ops) to ask about pricing template
 * state without reaching into billing's internals. The Spring Modulith pattern for
 * cross-module reads.
 */
public interface PricingTemplatesQuery {
    long countActiveForTenant(UUID tenantId);
}
