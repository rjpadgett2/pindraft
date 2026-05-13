package co.pindraft.identity.application;

import co.pindraft.common.error.PindraftException;

public class BootstrapDisabledException extends PindraftException {
    public BootstrapDisabledException() {
        super("bootstrap_disabled", "Bootstrap endpoint is disabled in this environment", 403);
    }
}
