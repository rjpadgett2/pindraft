package co.pindraft.pools.application;

import co.pindraft.common.error.PindraftException;
import java.util.UUID;

public class PoolNotFoundException extends PindraftException {
    public PoolNotFoundException(UUID id) {
        super("pool_not_found", "Pool " + id + " not found", 404);
    }
}
