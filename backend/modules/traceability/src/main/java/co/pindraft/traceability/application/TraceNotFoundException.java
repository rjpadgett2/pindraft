package co.pindraft.traceability.application;

import co.pindraft.common.error.PindraftException;

public class TraceNotFoundException extends PindraftException {
    public TraceNotFoundException(String identifier) {
        super("trace_not_found", "Trace " + identifier + " not found", 404);
    }
}
