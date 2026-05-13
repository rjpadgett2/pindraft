package co.pindraft.identity.application;

import co.pindraft.common.error.PindraftException;

public class InvalidRefreshTokenException extends PindraftException {
    public InvalidRefreshTokenException() {
        super("invalid_refresh_token", "Refresh token is invalid, expired, or revoked", 401);
    }
}
