package co.pindraft.mill_ops.application;

import co.pindraft.mill_ops.domain.FiberTestEntity;
import co.pindraft.mill_ops.domain.FiberTestType;
import co.pindraft.mill_ops.infrastructure.FiberTestRepository;
import co.pindraft.mill_ops.infrastructure.LotRepository;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.jspecify.annotations.NullMarked;
import org.jspecify.annotations.Nullable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@NullMarked
public class FiberTestService {

    private final FiberTestRepository tests;
    private final LotRepository lots;

    public FiberTestService(FiberTestRepository tests, LotRepository lots) {
        this.tests = tests;
        this.lots = lots;
    }

    @Transactional
    public FiberTestEntity attach(
        UUID tenantId, UUID lotId, FiberTestType testType, @Nullable String instrument,
        @Nullable BigDecimal resultNumeric, @Nullable String resultUnit, @Nullable String resultJson,
        Instant testedAt
    ) {
        var lot = lots.findById(lotId).orElseThrow(() -> new LotNotFoundException(lotId));
        if (!lot.getTenantId().equals(tenantId)) {
            throw new LotNotFoundException(lotId);
        }
        var entity = new FiberTestEntity(UUID.randomUUID(), lotId, testType, testedAt);
        entity.setInstrument(instrument);
        entity.setResultNumeric(resultNumeric);
        entity.setResultUnit(resultUnit);
        entity.setResultJson(resultJson);
        return tests.save(entity);
    }

    public List<FiberTestEntity> listForLot(UUID tenantId, UUID lotId) {
        var lot = lots.findById(lotId).orElseThrow(() -> new LotNotFoundException(lotId));
        if (!lot.getTenantId().equals(tenantId)) {
            throw new LotNotFoundException(lotId);
        }
        return tests.findByLotIdOrderByTestedAtDesc(lotId);
    }

    /** Customer-side view: all tests for lots the customer owns, for lifetime micron history. */
    public List<FiberTestEntity> listForLotIds(List<UUID> lotIds) {
        if (lotIds.isEmpty()) return List.of();
        return tests.findByLotIdInOrderByTestedAtDesc(lotIds);
    }
}
