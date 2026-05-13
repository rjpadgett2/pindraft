package co.pindraft.pools.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

import co.pindraft.pools.domain.PoolContributionEntity;
import co.pindraft.pools.domain.PoolEntity;
import co.pindraft.pools.domain.PoolKind;
import co.pindraft.pools.infrastructure.PoolContributionRepository;
import co.pindraft.pools.infrastructure.PoolRepository;
import co.pindraft.pools.infrastructure.SettlementRepository;
import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class PoolServiceTest {

    @Mock private PoolRepository pools;
    @Mock private PoolContributionRepository contributions;
    @Mock private SettlementRepository settlements;
    @Mock private org.springframework.context.ApplicationEventPublisher events;
    private PoolService service;

    private UUID tenantId;
    private UUID poolId;
    private PoolEntity pool;

    @BeforeEach
    void setUp() {
        service = new PoolService(pools, contributions, settlements, events);
        tenantId = UUID.randomUUID();
        poolId = UUID.randomUUID();
        pool = new PoolEntity(poolId, tenantId, "Spring 2026 fine wool", null, PoolKind.FINE_WOOL);
    }

    @Test
    void calculate_shares_with_three_equal_contributions_each_get_one_third() {
        var c1 = new PoolContributionEntity(UUID.randomUUID(), poolId, UUID.randomUUID(), "Alpha", new BigDecimal("10"), null);
        var c2 = new PoolContributionEntity(UUID.randomUUID(), poolId, UUID.randomUUID(), "Bravo", new BigDecimal("10"), null);
        var c3 = new PoolContributionEntity(UUID.randomUUID(), poolId, UUID.randomUUID(), "Charlie", new BigDecimal("10"), null);

        when(pools.findById(poolId)).thenReturn(Optional.of(pool));
        when(contributions.findByPoolIdOrderByAcceptedAt(poolId)).thenReturn(List.of(c1, c2, c3));

        var shares = service.calculateShares(poolId);

        assertThat(shares).hasSize(3);
        for (var share : shares) {
            assertThat(share.sharePercent()).isEqualByComparingTo("33.3333");
            assertThat(share.amountOwed()).isNull();  // pool not yet distributed
        }
    }

    @Test
    void calculate_shares_after_distribute_includes_dollar_amounts() {
        var c1 = new PoolContributionEntity(UUID.randomUUID(), poolId, UUID.randomUUID(), "Alpha", new BigDecimal("8"), null);
        var c2 = new PoolContributionEntity(UUID.randomUUID(), poolId, UUID.randomUUID(), "Bravo", new BigDecimal("12"), null);
        pool.close();
        pool.distribute(new BigDecimal("1000"));

        when(pools.findById(poolId)).thenReturn(Optional.of(pool));
        when(contributions.findByPoolIdOrderByAcceptedAt(poolId)).thenReturn(List.of(c1, c2));

        var shares = service.calculateShares(poolId);

        // 8/20 = 40% → $400
        // 12/20 = 60% → $600
        assertThat(shares.get(0).sharePercent()).isEqualByComparingTo("40.0000");
        assertThat(shares.get(0).amountOwed()).isEqualByComparingTo("400.00");
        assertThat(shares.get(1).sharePercent()).isEqualByComparingTo("60.0000");
        assertThat(shares.get(1).amountOwed()).isEqualByComparingTo("600.00");
    }

    @Test
    void calculate_shares_handles_empty_pool() {
        when(pools.findById(poolId)).thenReturn(Optional.of(pool));
        when(contributions.findByPoolIdOrderByAcceptedAt(poolId)).thenReturn(List.of());

        assertThat(service.calculateShares(poolId)).isEmpty();
    }

    @Test
    void record_contribution_rejected_when_pool_closed() {
        pool.close();
        when(pools.findById(poolId)).thenReturn(Optional.of(pool));

        assertThatThrownBy(() -> service.recordContribution(
            tenantId, poolId, UUID.randomUUID(), "Alpha", new BigDecimal("10"), null))
            .isInstanceOf(InvalidPoolStateException.class);
    }

    @Test
    void distribute_requires_pool_to_be_closed_first() {
        when(pools.findById(poolId)).thenReturn(Optional.of(pool));

        assertThatThrownBy(() -> service.distribute(tenantId, poolId, new BigDecimal("1000")))
            .isInstanceOf(IllegalStateException.class);
    }
}
