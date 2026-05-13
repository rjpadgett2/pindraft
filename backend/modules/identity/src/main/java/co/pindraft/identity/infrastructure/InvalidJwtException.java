package co.pindraft.identity.infrastructure;

import co.pindraft.common.error.PindraftException;

public class InvalidJwtException extends PindraftException {
    public InvalidJwtException(String message) {
        super("invalid_jwt", message, 401);
    }
}
