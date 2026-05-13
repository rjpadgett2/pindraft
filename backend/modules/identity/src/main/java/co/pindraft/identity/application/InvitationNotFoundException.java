package co.pindraft.identity.application;

public class InvitationNotFoundException extends RuntimeException {
    public InvitationNotFoundException() {
        super("Invitation not found or token invalid");
    }
}
