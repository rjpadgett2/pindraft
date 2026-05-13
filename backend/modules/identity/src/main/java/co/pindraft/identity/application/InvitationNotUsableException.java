package co.pindraft.identity.application;

import co.pindraft.identity.domain.InvitationStatus;

public class InvitationNotUsableException extends RuntimeException {
    public InvitationNotUsableException(InvitationStatus status) {
        super("Invitation is " + status + " — cannot be accepted");
    }
}
