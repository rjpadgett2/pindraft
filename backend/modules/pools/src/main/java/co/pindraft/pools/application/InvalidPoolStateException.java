package co.pindraft.pools.application;

import co.pindraft.common.error.PindraftException;
import co.pindraft.pools.domain.PoolStatus;

public class InvalidPoolStateException extends PindraftException {
    public InvalidPoolStateException(PoolStatus current, String action) {
        super(
            "invalid_pool_state",
            "Cannot " + action + " in pool state " + current,
            400
        );
    }
}
