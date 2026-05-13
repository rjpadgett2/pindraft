package co.pindraft.billing.application;

import co.pindraft.billing.domain.PricingKind;
import co.pindraft.common.error.PindraftException;

public class InvalidPricingConfigException extends PindraftException {
    public InvalidPricingConfigException(PricingKind kind, String reason) {
        super(
            "invalid_pricing_config",
            "Invalid config for " + kind + ": " + reason,
            400
        );
    }
}
