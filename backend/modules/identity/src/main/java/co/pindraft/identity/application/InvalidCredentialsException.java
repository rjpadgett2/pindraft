package co.pindraft.identity.application;

import co.pindraft.common.error.PindraftException;

public class InvalidCredentialsException extends PindraftException {
    public InvalidCredentialsException() {
        super("invalid_credentials", "Email or password is incorrect", 401);
    }
}
