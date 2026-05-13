package co.pindraft.pools.api;

import co.pindraft.common.security.TenantContextHolder;
import co.pindraft.pools.application.CustomerPoolService;
import co.pindraft.pools.application.CustomerPoolService.UserPoolMembership;
import co.pindraft.pools.application.PoolService.ContributorShare;
import co.pindraft.pools.domain.PoolKind;
import co.pindraft.pools.domain.PoolStatus;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.springframework.web.bind.annotation.*;

/**
 * Customer-side pool endpoints. Cross-tenant; scoped by the user's tenant_customers.
 */
@RestController
@RequestMapping("/api/v1/me/pools")
@Tag(name = "Customer", description = "Customer-side pool views")
public class MePoolController {

    private final CustomerPoolService service;
    private final TenantContextHolder contextHolder;

    public MePoolController(CustomerPoolService service, TenantContextHolder contextHolder) {
        this.service = service;
        this.contextHolder = contextHolder;
    }

    @GetMapping
    @Operation(summary = "List pools I've contributed to across all mills")
    public List<MembershipResponse> list() {
        var userId = contextHolder.get().userId();
        if (userId == null) throw new IllegalStateException("No authenticated user");
        return service.listForUser(userId).stream().map(MePoolController::toResponse).toList();
    }

    private static MembershipResponse toResponse(UserPoolMembership m) {
        var pool = m.pool();
        var shares = m.myShares().stream().map(MePoolController::toShareResponse).toList();
        return new MembershipResponse(
            pool.getId(), pool.getTenantId(), pool.getName(), pool.getDescription(),
            pool.getKind(), pool.getStatus(), pool.getTotalRevenue(),
            pool.getCreatedAt(), pool.getClosedAt(), pool.getDistributedAt(),
            m.myTotalWeight(), shares);
    }

    private static ShareResponse toShareResponse(ContributorShare s) {
        return new ShareResponse(s.weightKg(), s.sharePercent(), s.amountOwed());
    }

    public record MembershipResponse(
        UUID poolId, UUID tenantId, String name, String description,
        PoolKind kind, PoolStatus status, BigDecimal totalRevenue,
        Instant createdAt, Instant closedAt, Instant distributedAt,
        BigDecimal myTotalWeight, List<ShareResponse> myShares) {}

    public record ShareResponse(
        BigDecimal weightKg, BigDecimal sharePercent, BigDecimal amountOwed) {}
}
