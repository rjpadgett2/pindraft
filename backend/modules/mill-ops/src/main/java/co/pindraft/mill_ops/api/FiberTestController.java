package co.pindraft.mill_ops.api;

import co.pindraft.common.security.TenantAccessGuard;
import co.pindraft.mill_ops.application.FiberTestService;
import co.pindraft.mill_ops.domain.FiberTestEntity;
import co.pindraft.mill_ops.domain.FiberTestType;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.jspecify.annotations.Nullable;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/tenants/{tenantId}/lots/{lotId}/fiber-tests")
@Tag(name = "Operations", description = "Fiber test results attached to a lot")
public class FiberTestController {

    private final FiberTestService service;
    private final TenantAccessGuard accessGuard;

    public FiberTestController(FiberTestService service, TenantAccessGuard accessGuard) {
        this.service = service;
        this.accessGuard = accessGuard;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Attach a fiber test to a lot")
    public TestResponse attach(
        @PathVariable UUID tenantId, @PathVariable UUID lotId,
        @Valid @RequestBody AttachRequest req
    ) {
        accessGuard.requireStaffAccess(tenantId);
        var entity = service.attach(
            tenantId, lotId, req.testType(), req.instrument(),
            req.resultNumeric(), req.resultUnit(), req.resultJson(),
            req.testedAt() != null ? req.testedAt() : Instant.now());
        return toResponse(entity);
    }

    @GetMapping
    @Operation(summary = "List all fiber tests attached to a lot")
    public List<TestResponse> list(@PathVariable UUID tenantId, @PathVariable UUID lotId) {
        accessGuard.requireStaffAccess(tenantId);
        return service.listForLot(tenantId, lotId).stream()
            .map(FiberTestController::toResponse).toList();
    }

    private static TestResponse toResponse(FiberTestEntity e) {
        return new TestResponse(
            e.getId(), e.getLotId(), e.getTestType(),
            e.getInstrument(), e.getResultNumeric(), e.getResultUnit(),
            e.getResultJson(), e.getTestedAt(), e.getCreatedAt());
    }

    public record AttachRequest(
        @NotNull FiberTestType testType,
        @Nullable String instrument,
        @Nullable BigDecimal resultNumeric,
        @Nullable String resultUnit,
        @Nullable String resultJson,
        @Nullable Instant testedAt) {}

    public record TestResponse(
        UUID id, UUID lotId, FiberTestType testType,
        String instrument, BigDecimal resultNumeric, String resultUnit,
        String resultJson, Instant testedAt, Instant createdAt) {}
}
