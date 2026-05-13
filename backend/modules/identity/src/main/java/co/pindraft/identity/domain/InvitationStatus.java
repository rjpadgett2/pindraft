package co.pindraft.identity.domain;

/**
 * Lifecycle of a tenant invitation.
 *
 * <p>PENDING — created by the admin, not yet acted on.
 * ACCEPTED — claimed by the invitee; tenant_membership row was created.
 * EXPIRED — past expires_at without being accepted.
 * REVOKED — admin cancelled it before acceptance.
 */
public enum InvitationStatus {
    PENDING,
    ACCEPTED,
    EXPIRED,
    REVOKED
}
