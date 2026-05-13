package co.pindraft.identity.domain;

/**
 * Tenant lifecycle status.
 *
 * <ul>
 *   <li>{@code SETUP} — onboarding incomplete. Reservation endpoint returns 423. Not in directory.</li>
 *   <li>{@code LIVE} — operating normally. All surfaces enabled.</li>
 *   <li>{@code PAUSED} — admin temporarily not accepting new intake. Blocks new reservations.</li>
 * </ul>
 */
public enum TenantStatus {
    SETUP,
    LIVE,
    PAUSED
}
