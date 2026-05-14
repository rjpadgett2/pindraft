package co.pindraft.common.error;

import java.net.URI;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

/**
 * Global exception → RFC 7807 problem-details mapping.
 *
 * <p>Pindraft exceptions extend {@link PindraftException} and provide their own code + HTTP status.
 * Validation errors are unwrapped into a standard 400 with field-level details.
 * Anything else falls through to a 500.
 */
@RestControllerAdvice
public class ProblemDetailHandler {

    private static final Logger log = LoggerFactory.getLogger(ProblemDetailHandler.class);

    @ExceptionHandler(PindraftException.class)
    public ProblemDetail handlePindraftException(PindraftException e) {
        var problem = ProblemDetail.forStatusAndDetail(
            HttpStatus.valueOf(e.getHttpStatus()),
            e.getMessage()
        );
        problem.setType(URI.create("https://pindraft.co/problems/" + e.getCode()));
        problem.setProperty("code", e.getCode());
        return problem;
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ProblemDetail handleValidation(MethodArgumentNotValidException e) {
        var problem = ProblemDetail.forStatusAndDetail(
            HttpStatus.BAD_REQUEST,
            "Request validation failed"
        );
        problem.setType(URI.create("https://pindraft.co/problems/invalid_request"));
        problem.setProperty("code", "invalid_request");
        problem.setProperty("errors", e.getBindingResult().getFieldErrors().stream()
            .map(err -> new FieldError(err.getField(), err.getDefaultMessage()))
            .toList());
        return problem;
    }

    @ExceptionHandler(Exception.class)
    public ProblemDetail handleUnexpected(Exception e) {
        // Log the full stack trace — the response is intentionally generic for callers,
        // but a silent 500 with no server-side breadcrumb is debugging hostile.
        log.error("Unhandled exception bubbled to ProblemDetailHandler", e);
        var problem = ProblemDetail.forStatusAndDetail(
            HttpStatus.INTERNAL_SERVER_ERROR,
            "An unexpected error occurred"
        );
        problem.setType(URI.create("https://pindraft.co/problems/internal_error"));
        problem.setProperty("code", "internal_error");
        return problem;
    }

    public record FieldError(String field, String message) {}
}
