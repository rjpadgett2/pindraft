package co.pindraft.pools.api;

import co.pindraft.common.security.TenantAccessGuard;
import co.pindraft.pools.application.PoolService;
import co.pindraft.pools.application.PoolService.ContributorShare;
import co.pindraft.pools.domain.PoolContributionEntity;
import co.pindraft.pools.domain.PoolEntity;
import co.pindraft.pools.domain.PoolKind;
import co.pindraft.pools.domain.PoolStatus;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/tenants/{tenantId}/pools")
@Tag(name = "Pools", description = "Wool pool formation, contributions, distribution")
public class PoolController {

    private final PoolService service;
    private final TenantAccessGuard accessGuard;

    public PoolController(PoolService service, TenantAccessGuard accessGuard) {
        this.service = service;
        this.accessGuard = accessGuard;
    }

    @GetMapping
    @Operation(summary = "List the tenant's pools")
    public List<PoolResponse> list(@PathVariable UUID tenantId) {
        accessGuard.requireStaffAccess(tenantId);
        return service.listForTenant(tenantId).stream().map(PoolController::toResponse).toList();
    }

    @GetMapping("/accepting")
    @Operation(summary = "List ACCEPTING pools — used by intake to offer pool selection")
    public List<PoolResponse> listAccepting(@PathVariable UUID tenantId) {
        accessGuard.requireStaffAccess(tenantId);
        return service.findAllAcceptingForTenant(tenantId).stream()
            .map(PoolController::toResponse).toList();
    }

    @GetMapping("/{poolId}")
    @Operation(summary = "Get one pool with contributions and computed shares")
    public PoolDetailResponse getOne(@PathVariable UUID tenantId, @PathVariable UUID poolId) {
        accessGuard.requireStaffAccess(tenantId);
        var pool = service.getOne(tenantId, poolId);
        var contributions = service.listContributions(poolId).stream()
            .map(PoolController::toContributionResponse).toList();
        var shares = service.calculateShares(poolId).stream()
            .map(PoolController::toShareResponse).toList();
        return new PoolDetailResponse(toResponse(pool), contributions, shares);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Create a new pool, ACCEPTING contributions")
    public PoolResponse create(@PathVariable UUID tenantId, @Valid @RequestBody CreateRequest req) {
        accessGuard.requireStaffAccess(tenantId);
        return toResponse(service.create(tenantId, req.name(), req.description(), req.kind()));
    }

    @PostMapping("/{poolId}/contributions")
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Record a contribution from a customer")
    public ContributionResponse contribute(
        @PathVariable UUID tenantId, @PathVariable UUID poolId,
        @Valid @RequestBody ContributionRequest req
    ) {
        accessGuard.requireStaffAccess(tenantId);
        var c = service.recordContribution(
            tenantId, poolId, req.customerId(), req.customerDisplayName(),
            req.weightKg(), req.notes(), req.sourceLotId());
        return toContributionResponse(c);
    }

    @PostMapping("/{poolId}/close")
    @Operation(summary = "Close a pool — no more contributions accepted")
    public PoolResponse close(@PathVariable UUID tenantId, @PathVariable UUID poolId) {
        accessGuard.requireStaffAccess(tenantId);
        return toResponse(service.close(tenantId, poolId));
    }

    @PostMapping("/{poolId}/distribute")
    @Operation(summary = "Distribute the pool with a total revenue amount")
    public PoolResponse distribute(
        @PathVariable UUID tenantId, @PathVariable UUID poolId,
        @Valid @RequestBody DistributeRequest req
    ) {
        accessGuard.requireStaffAccess(tenantId);
        return toResponse(service.distribute(tenantId, poolId, req.totalRevenue()));
    }

    private static PoolResponse toResponse(PoolEntity p) {
        return new PoolResponse(
            p.getId(), p.getName(), p.getDescription(), p.getKind(),
            p.getStatus(), p.getTotalRevenue(),
            p.getCreatedAt(), p.getClosedAt(), p.getDistributedAt());
    }

    private static ContributionResponse toContributionResponse(PoolContributionEntity c) {
        return new ContributionResponse(
            c.getId(), c.getCustomerId(), c.getCustomerDisplayName(),
            c.getWeightKg(), c.getNotes(), c.getAcceptedAt());
    }

    private static ShareResponse toShareResponse(ContributorShare s) {
        return new ShareResponse(
            s.contributionId(), s.customerId(), s.customerDisplayName(),
            s.weightKg(), s.sharePercent(), s.amountOwed());
    }

    public record PoolResponse(
        UUID id, String name, String description, PoolKind kind,
        PoolStatus status, BigDecimal totalRevenue,
        Instant createdAt, Instant closedAt, Instant distributedAt) {}
    public record PoolDetailResponse(
        PoolResponse pool, List<ContributionResponse> contributions, List<ShareResponse> shares) {}
    public record ContributionResponse(
        UUID id, UUID customerId, String customerDisplayName,
        BigDecimal weightKg, String notes, Instant acceptedAt) {}
    public record ShareResponse(
        UUID contributionId, UUID customerId, String customerDisplayName,
        BigDecimal weightKg, BigDecimal sharePercent, BigDecimal amountOwed) {}
    public record CreateRequest(
        @NotBlank String name, String description, @NotNull PoolKind kind) {}
    public record ContributionRequest(
        @NotNull UUID customerId, @NotBlank String customerDisplayName,
        @NotNull @Positive BigDecimal weightKg, String notes,
        UUID sourceLotId) {}
    public record DistributeRequest(@NotNull @Positive BigDecimal totalRevenue) {}
}
