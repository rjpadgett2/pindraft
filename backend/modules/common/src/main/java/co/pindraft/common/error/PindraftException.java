package co.pindraft.common.error;

import org.jspecify.annotations.NullMarked;

/**
 * Base for Pindraft domain exceptions. Each subclass declares its problem-type {@code code}
 * (for the RFC 7807 {@code code} field) and HTTP status.
 *
 * <p>{@link ProblemDetailHandler} maps these to RFC 7807 problem-details responses globally.
 * Don't catch and rethrow as another type — let domain exceptions flow up.
 */
@NullMarked
public class PindraftException extends RuntimeException {
    private final String code;
    private final int httpStatus;

    public PindraftException(String code, String message, int httpStatus) {
        super(message);
        this.code = code;
        this.httpStatus = httpStatus;
    }

    public String getCode() {
        return code;
    }

    public int getHttpStatus() {
        return httpStatus;
    }
}
