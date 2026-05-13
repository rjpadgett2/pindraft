package co.pindraft.pools.api;

import co.pindraft.common.security.TenantAccessGuard;
import co.pindraft.pools.domain.SettlementDistributionEntity;
import co.pindraft.pools.domain.SettlementEntity;
import co.pindraft.pools.infrastructure.SettlementRepository;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/tenants/{tenantId}/settlements")
@Tag(name = "Settlements", description = "Wool-pool settlements and contributor distributions")
public class SettlementController {

    private final SettlementRepository settlements;
    private final TenantAccessGuard accessGuard;

    public SettlementController(SettlementRepository settlements, TenantAccessGuard accessGuard) {
        this.settlements = settlements;
        this.accessGuard = accessGuard;
    }

    @GetMapping
    @Operation(summary = "List settlements for a tenant, most recent first")
    public List<SettlementResponse> list(@PathVariable UUID tenantId) {
        accessGuard.requireStaffAccess(tenantId);
        return settlements.findByTenantIdOrderBySettledAtDesc(tenantId).stream()
            .map(SettlementController::toResponse).toList();
    }

    @GetMapping("/{id}")
    @Operation(summary = "One settlement with its per-contributor distribution lines")
    public SettlementDetailResponse getOne(@PathVariable UUID tenantId, @PathVariable UUID id) {
        accessGuard.requireStaffAccess(tenantId);
        var s = settlements.findById(id)
            .orElseThrow(() -> new SettlementNotFoundException(id));
        return new SettlementDetailResponse(
            toResponse(s),
            s.getDistributions().stream().map(SettlementController::toDistResponse).toList());
    }

    private static SettlementResponse toResponse(SettlementEntity s) {
        return new SettlementResponse(
            s.getId(), s.getTenantId(), s.getPoolId(),
            s.getTotalRevenueCents(), s.getCurrency(),
            s.getDistributions().size(), s.getSettledAt());
    }

    private static DistributionResponse toDistResponse(SettlementDistributionEntity d) {
        return new DistributionResponse(
            d.getId(), d.getCustomerId(), d.getCustomerDisplayName(),
            d.getWeightKg(), d.getSharePercent(), d.getAmountCents(), d.getPaidAt());
    }

    public record SettlementResponse(
        UUID id, UUID tenantId, UUID poolId,
        long totalRevenueCents, String currency,
        int distributionCount, Instant settledAt) {}

    public record SettlementDetailResponse(
        SettlementResponse settlement, List<DistributionResponse> distributions) {}

    public record DistributionResponse(
        UUID id, UUID customerId, String customerDisplayName,
        BigDecimal weightKg, BigDecimal sharePercent,
        long amountCents, Instant paidAt) {}
}
