package co.pindraft.billing.application;

import co.pindraft.billing.PricingArrangementLookup;
import co.pindraft.billing.PricingTemplatesQuery;
import co.pindraft.billing.domain.PricingArrangementEntity;
import co.pindraft.billing.domain.PricingKind;
import co.pindraft.billing.infrastructure.PricingArrangementRepository;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Pricing arrangement CRUD with per-kind config validation. Also implements two
 * cross-module published interfaces: {@link PricingTemplatesQuery} for setup-status
 * checks, and {@link PricingArrangementLookup} for snapshot-at-decision-moment reads
 * by the intake transaction.
 */
@Service
public class PricingArrangementService implements PricingTemplatesQuery, PricingArrangementLookup {

    private final PricingArrangementRepository repo;
    private final ObjectMapper mapper;

    public PricingArrangementService(PricingArrangementRepository repo, ObjectMapper mapper) {
        this.repo = repo;
        this.mapper = mapper;
    }

    public List<PricingArrangementEntity> listForTenant(UUID tenantId) {
        return repo.findByTenantIdAndActiveTrueOrderByName(tenantId);
    }

    @Override
    public long countActiveForTenant(UUID tenantId) {
        return repo.countByTenantIdAndActiveTrue(tenantId);
    }

    @Override
    public Optional<Snapshot> snapshot(UUID arrangementId) {
        return repo.findById(arrangementId)
            .map(e -> new Snapshot(e.getId(), e.getName(), e.getKind().name(), e.getConfigJson()));
    }

    @Transactional
    public PricingArrangementEntity create(UUID tenantId, String name, PricingKind kind, JsonNode config) {
        validateConfig(kind, config);
        var entity = new PricingArrangementEntity(
            UUID.randomUUID(), tenantId, name, kind, config.toString());
        return repo.save(entity);
    }

    @Transactional
    public PricingArrangementEntity update(UUID tenantId, UUID id, String name, JsonNode config) {
        var entity = repo.findById(id).orElseThrow(() -> new PricingArrangementNotFoundException(id));
        if (!entity.getTenantId().equals(tenantId)) {
            throw new PricingArrangementNotFoundException(id);
        }
        if (name != null) entity.rename(name);
        if (config != null) {
            validateConfig(entity.getKind(), config);
            entity.updateConfig(config.toString());
        }
        return repo.save(entity);
    }

    @Transactional
    public void deactivate(UUID tenantId, UUID id) {
        var entity = repo.findById(id).orElseThrow(() -> new PricingArrangementNotFoundException(id));
        if (!entity.getTenantId().equals(tenantId)) {
            throw new PricingArrangementNotFoundException(id);
        }
        entity.deactivate();
        repo.save(entity);
    }

    /**
     * Per-kind config validation. Throws {@link InvalidPricingConfigException} with a
     * specific reason when the config doesn't match its kind.
     */
    void validateConfig(PricingKind kind, JsonNode config) {
        if (config == null || !config.isObject()) {
            throw new InvalidPricingConfigException(kind, "config must be an object");
        }
        switch (kind) {
            case PER_POUND -> requirePositive(config, "pricePerKg", kind);
            case HYBRID -> {
                requireNonNegative(config, "flatFee", kind);
                requirePositive(config, "pricePerKg", kind);
            }
            case TIERED_BY_GRADE -> {
                if (!config.has("tiers") || !config.get("tiers").isArray() || config.get("tiers").isEmpty()) {
                    throw new InvalidPricingConfigException(kind, "tiers must be a non-empty array");
                }
                for (JsonNode tier : config.get("tiers")) {
                    requirePositive(tier, "maxMicron", kind);
                    requirePositive(tier, "pricePerKg", kind);
                }
            }
            case REVENUE_SPLIT -> {
                requireInRange(config, "millPercent", 0, 100, kind);
                requireInRange(config, "brandPercent", 0, 100, kind);
                double mill = config.get("millPercent").asDouble();
                double brand = config.get("brandPercent").asDouble();
                if (Math.abs((mill + brand) - 100.0) > 0.01) {
                    throw new InvalidPricingConfigException(kind, "millPercent + brandPercent must equal 100");
                }
            }
        }
    }

    private void requirePositive(JsonNode node, String field, PricingKind kind) {
        if (!node.has(field) || !node.get(field).isNumber() || node.get(field).asDouble() <= 0) {
            throw new InvalidPricingConfigException(kind, field + " must be a positive number");
        }
    }

    private void requireNonNegative(JsonNode node, String field, PricingKind kind) {
        if (!node.has(field) || !node.get(field).isNumber() || node.get(field).asDouble() < 0) {
            throw new InvalidPricingConfigException(kind, field + " must be zero or positive");
        }
    }

    private void requireInRange(JsonNode node, String field, double min, double max, PricingKind kind) {
        if (!node.has(field) || !node.get(field).isNumber()) {
            throw new InvalidPricingConfigException(kind, field + " must be a number");
        }
        double v = node.get(field).asDouble();
        if (v < min || v > max) {
            throw new InvalidPricingConfigException(kind, field + " must be between " + min + " and " + max);
        }
    }
}
