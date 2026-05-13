package co.pindraft.mill_ops.domain;

/**
 * Invoice lifecycle.
 *
 * <p>DRAFT — auto-generated from a LotCompletedEvent; not yet shown to the customer.
 * ISSUED — operator confirmed and surfaced to the customer.
 * PAID — payment recorded (manual entry for v1; payment-rail integration later).
 * VOID — superseded or cancelled, kept for audit.
 */
public enum InvoiceStatus {
    DRAFT,
    ISSUED,
    PAID,
    VOID
}
