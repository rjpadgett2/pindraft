package co.pindraft.traceability.api;

import co.pindraft.traceability.application.TraceService;
import co.pindraft.traceability.domain.TraceRecordEntity;
import co.pindraft.traceability.domain.TraceSegmentEntity;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import org.springframework.web.bind.annotation.*;

/**
 * Unauthenticated public lookup. The route is whitelisted in {@code SecurityConfig}
 * so visitors can reach a trace via printed QR codes, marketplace links, etc.
 */
@RestController
@RequestMapping("/api/v1/public/trace")
@Tag(name = "Public", description = "Unauthenticated public surfaces")
public class PublicTraceController {

    private final TraceService service;

    public PublicTraceController(TraceService service) {
        this.service = service;
    }

    @GetMapping("/{slug}")
    @Operation(summary = "Public trace lookup by slug. 404 if not visible.")
    public PublicTraceResponse get(@PathVariable String slug) {
        TraceRecordEntity record = service.getBySlugIfPublic(slug);
        List<TraceSegmentEntity> segments = service.segmentsForRecord(record.getId());
        var segmentResponses = segments.stream().map(PublicTraceController::toSegment).toList();
        return new PublicTraceResponse(
            record.getSlug(),
            record.getCustomerDisplayName(),
            record.getIntakeWeightKg(),
            record.getCreatedAt(),
            segmentResponses);
    }

    private static SegmentResponse toSegment(TraceSegmentEntity s) {
        return new SegmentResponse(
            s.getStageType(), s.getEnteredAt(), s.getExitedAt(),
            s.getWeightInKg(), s.getWeightOutKg());
    }

    public record PublicTraceResponse(
        String slug, String customerDisplayName,
        BigDecimal intakeWeightKg, Instant createdAt,
        List<SegmentResponse> segments) {}

    public record SegmentResponse(
        String stageType, Instant enteredAt, Instant exitedAt,
        BigDecimal weightInKg, BigDecimal weightOutKg) {}
}
