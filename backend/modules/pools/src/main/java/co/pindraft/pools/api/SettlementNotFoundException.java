package co.pindraft.pools.api;

import java.util.UUID;

public class SettlementNotFoundException extends RuntimeException {
    public SettlementNotFoundException(UUID id) {
        super("Settlement not found: " + id);
    }
}
