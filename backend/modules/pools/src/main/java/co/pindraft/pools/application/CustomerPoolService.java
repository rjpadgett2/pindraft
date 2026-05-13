package co.pindraft.pools.application;

import co.pindraft.identity.domain.TenantCustomerEntity;
import co.pindraft.identity.infrastructure.TenantCustomerRepository;
import co.pindraft.pools.domain.PoolContributionEntity;
import co.pindraft.pools.domain.PoolEntity;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;
import org.jspecify.annotations.NullMarked;
import org.springframework.stereotype.Service;

/**
 * Customer-side pool queries. Cross-tenant: a shepherd may contribute to pools at
 * multiple mills, all surfaced together as one stream.
 *
 * <p>Access control is implicit: the query starts from the user's own tenant_customers
 * rows, so there's no way to reach a contribution that isn't theirs.
 */
@Service
@NullMarked
public class CustomerPoolService {

    private final PoolService poolService;
    private final TenantCustomerRepository customers;

    public CustomerPoolService(PoolService poolService, TenantCustomerRepository customers) {
        this.poolService = poolService;
        this.customers = customers;
    }

    /**
     * For the current user, list every pool they've contributed to, with their own
     * contribution + computed share alongside the pool itself.
     */
    public List<UserPoolMembership> listForUser(UUID userId) {
        var myCustomerIds = customers.findByUserId(userId).stream()
            .map(TenantCustomerEntity::getId).toList();
        if (myCustomerIds.isEmpty()) return List.of();

        var myContributions = poolService.findContributionsForCustomers(myCustomerIds);
        if (myContributions.isEmpty()) return List.of();

        // Group by pool. A user typically has one contribution per pool, but the model
        // allows multiple — sum them when displaying.
        var contributionsByPool = myContributions.stream()
            .collect(Collectors.groupingBy(PoolContributionEntity::getPoolId));

        return contributionsByPool.entrySet().stream().map(entry -> {
            var poolId = entry.getKey();
            var contribs = entry.getValue();
            var pool = poolService.findById(poolId);

            // Sum the user's own contributions to this pool
            var myWeight = contribs.stream()
                .map(PoolContributionEntity::getWeightKg)
                .reduce(java.math.BigDecimal.ZERO, java.math.BigDecimal::add);

            // Locate the user's share row(s) in the pool's full share calc
            var allShares = poolService.calculateShares(poolId);
            var contribIds = contribs.stream().map(PoolContributionEntity::getId).toList();
            var myShares = allShares.stream()
                .filter(s -> contribIds.contains(s.contributionId()))
                .toList();

            return new UserPoolMembership(pool, myWeight, myShares);
        }).toList();
    }

    public record UserPoolMembership(
        PoolEntity pool,
        java.math.BigDecimal myTotalWeight,
        List<PoolService.ContributorShare> myShares
    ) {}
}
