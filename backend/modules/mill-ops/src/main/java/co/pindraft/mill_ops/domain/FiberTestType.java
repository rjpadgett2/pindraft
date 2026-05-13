package co.pindraft.mill_ops.domain;

/**
 * The four canonical fiber test kinds. Matches the CHECK constraint on fiber_tests.
 */
public enum FiberTestType {
    MICRON_DIAMETER,
    COMFORT_FACTOR,
    STAPLE_LENGTH,
    IWTO_47_DISTRIBUTION
}
