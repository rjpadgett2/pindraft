package co.pindraft.mill_ops.application;

import java.util.UUID;

public class InvoiceNotFoundException extends RuntimeException {
    public InvoiceNotFoundException(UUID id) {
        super("Invoice not found: " + id);
    }
}
