package co.pindraft.pools.domain;

/**
 * Pool lifecycle.
 *
 * <ul>
 *   <li>ACCEPTING — open for contributions.</li>
 *   <li>CLOSED — no more contributions, fiber being processed.</li>
 *   <li>DISTRIBUTED — revenue recorded, shares computed.</li>
 * </ul>
 */
public enum PoolStatus {
    ACCEPTING, CLOSED, DISTRIBUTED
}
