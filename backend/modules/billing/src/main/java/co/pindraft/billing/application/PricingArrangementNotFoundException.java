package co.pindraft.billing.application;

import co.pindraft.common.error.PindraftException;
import java.util.UUID;

public class PricingArrangementNotFoundException extends PindraftException {
    public PricingArrangementNotFoundException(UUID id) {
        super("pricing_arrangement_not_found", "Pricing arrangement " + id + " not found", 404);
    }
}
