package co.pindraft.pools.domain;

/**
 * What kind of fiber the pool targets. Helps the mill organize and helps contributors
 * understand what they're joining.
 */
public enum PoolKind {
    FINE_WOOL,
    MEDIUM_WOOL,
    LONG_WOOL,
    COLORED_WOOL,
    MIXED,
    OTHER
}
