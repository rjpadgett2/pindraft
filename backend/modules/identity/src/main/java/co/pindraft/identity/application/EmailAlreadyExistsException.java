package co.pindraft.identity.application;

import co.pindraft.common.error.PindraftException;

public class EmailAlreadyExistsException extends PindraftException {
    public EmailAlreadyExistsException(String email) {
        super("email_already_exists", "An account with email " + email + " already exists", 409);
    }
}
