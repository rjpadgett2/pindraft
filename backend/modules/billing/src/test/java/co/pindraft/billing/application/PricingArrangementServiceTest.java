package co.pindraft.billing.application;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import co.pindraft.billing.domain.PricingKind;
import co.pindraft.billing.infrastructure.PricingArrangementRepository;
import tools.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

/**
 * Tests for {@link PricingArrangementService#validateConfig} — the per-kind config
 * validation rules. One behavior per test method.
 */
@ExtendWith(MockitoExtension.class)
class PricingArrangementServiceTest {

    @Mock private PricingArrangementRepository repo;
    private final ObjectMapper mapper = new ObjectMapper();
    private PricingArrangementService service;

    @BeforeEach
    void setUp() {
        service = new PricingArrangementService(repo, mapper);
    }

    @Test
    void per_pound_accepts_positive_price() throws Exception {
        var config = mapper.readTree("{ \"pricePerKg\": 12.50 }");
        assertThatCode(() -> service.validateConfig(PricingKind.PER_POUND, config))
            .doesNotThrowAnyException();
    }

    @Test
    void per_pound_rejects_zero_price() throws Exception {
        var config = mapper.readTree("{ \"pricePerKg\": 0 }");
        assertThatThrownBy(() -> service.validateConfig(PricingKind.PER_POUND, config))
            .isInstanceOf(InvalidPricingConfigException.class);
    }

    @Test
    void per_pound_rejects_missing_price() throws Exception {
        var config = mapper.readTree("{}");
        assertThatThrownBy(() -> service.validateConfig(PricingKind.PER_POUND, config))
            .isInstanceOf(InvalidPricingConfigException.class);
    }

    @Test
    void revenue_split_accepts_split_that_sums_to_100() throws Exception {
        var config = mapper.readTree("{ \"millPercent\": 60, \"brandPercent\": 40 }");
        assertThatCode(() -> service.validateConfig(PricingKind.REVENUE_SPLIT, config))
            .doesNotThrowAnyException();
    }

    @Test
    void revenue_split_rejects_split_that_does_not_sum_to_100() throws Exception {
        var config = mapper.readTree("{ \"millPercent\": 60, \"brandPercent\": 30 }");
        assertThatThrownBy(() -> service.validateConfig(PricingKind.REVENUE_SPLIT, config))
            .isInstanceOf(InvalidPricingConfigException.class);
    }

    @Test
    void tiered_rejects_empty_tier_list() throws Exception {
        var config = mapper.readTree("{ \"tiers\": [] }");
        assertThatThrownBy(() -> service.validateConfig(PricingKind.TIERED_BY_GRADE, config))
            .isInstanceOf(InvalidPricingConfigException.class);
    }

    @Test
    void tiered_accepts_valid_tier_list() throws Exception {
        var config = mapper.readTree(
            "{ \"tiers\": ["
            + "  { \"maxMicron\": 22, \"pricePerKg\": 18.00 },"
            + "  { \"maxMicron\": 28, \"pricePerKg\": 14.50 }"
            + "]}"
        );
        assertThatCode(() -> service.validateConfig(PricingKind.TIERED_BY_GRADE, config))
            .doesNotThrowAnyException();
    }

    @Test
    void hybrid_accepts_flat_plus_per_kg() throws Exception {
        var config = mapper.readTree("{ \"flatFee\": 50, \"pricePerKg\": 10 }");
        assertThatCode(() -> service.validateConfig(PricingKind.HYBRID, config))
            .doesNotThrowAnyException();
    }
}
