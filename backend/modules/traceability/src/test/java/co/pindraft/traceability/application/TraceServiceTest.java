package co.pindraft.traceability.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import co.pindraft.traceability.TraceEmitter;
import co.pindraft.traceability.domain.TraceRecordEntity;
import co.pindraft.traceability.domain.TraceSegmentEntity;
import co.pindraft.traceability.infrastructure.TraceRecordRepository;
import co.pindraft.traceability.infrastructure.TraceSegmentRepository;
import java.math.BigDecimal;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class TraceServiceTest {

    @Mock private TraceRecordRepository records;
    @Mock private TraceSegmentRepository segments;

    private TraceService service;

    @BeforeEach
    void setUp() {
        service = new TraceService(records, segments);
    }

    @Test
    void emit_intake_creates_record_with_unique_slug_and_first_segment() {
        var lotId = UUID.randomUUID();
        when(records.findByLotId(lotId)).thenReturn(Optional.empty());
        when(records.existsBySlug(anyString())).thenReturn(false);
        when(records.save(any(TraceRecordEntity.class))).thenAnswer(inv -> inv.getArgument(0));

        var slug = service.emitIntake(new TraceEmitter.IntakeData(
            lotId, "Bramble Farm", new BigDecimal("12.5")));

        assertThat(slug).hasSize(6);
        verify(records).save(any(TraceRecordEntity.class));
        verify(segments).save(any(TraceSegmentEntity.class));
    }

    @Test
    void emit_intake_is_idempotent_returning_existing_slug() {
        var lotId = UUID.randomUUID();
        var existing = new TraceRecordEntity(
            UUID.randomUUID(), lotId, "ABC123", "Bramble Farm", new BigDecimal("12.5"));
        when(records.findByLotId(lotId)).thenReturn(Optional.of(existing));

        var slug = service.emitIntake(new TraceEmitter.IntakeData(
            lotId, "Bramble Farm", new BigDecimal("12.5")));

        assertThat(slug).isEqualTo("ABC123");
        verify(records, never()).save(any(TraceRecordEntity.class));
        verify(segments, never()).save(any(TraceSegmentEntity.class));
    }

    @Test
    void emit_stage_transition_closes_open_segment_and_opens_new_one() {
        var lotId = UUID.randomUUID();
        var recordId = UUID.randomUUID();
        var record = new TraceRecordEntity(
            recordId, lotId, "ABC123", "Bramble Farm", new BigDecimal("12.5"));
        var openSegment = new TraceSegmentEntity(
            UUID.randomUUID(), recordId, "INTAKE", new BigDecimal("12.5"));

        when(records.findByLotId(lotId)).thenReturn(Optional.of(record));
        when(segments.findOpenForRecord(recordId)).thenReturn(Optional.of(openSegment));

        service.emitStageTransition(lotId, "SORT", new BigDecimal("12.2"));

        assertThat(openSegment.getExitedAt()).isNotNull();
        assertThat(openSegment.getWeightOutKg()).isEqualByComparingTo("12.2");
        verify(segments).save(openSegment);
        verify(segments).save(any(TraceSegmentEntity.class));  // new segment
    }

    @Test
    void emit_stage_transition_is_a_noop_when_no_trace_record_exists() {
        var lotId = UUID.randomUUID();
        when(records.findByLotId(lotId)).thenReturn(Optional.empty());

        service.emitStageTransition(lotId, "SORT", new BigDecimal("12.2"));

        verify(segments, never()).save(any(TraceSegmentEntity.class));
    }

    @Test
    void get_by_slug_throws_when_not_publicly_visible() {
        var record = new TraceRecordEntity(
            UUID.randomUUID(), UUID.randomUUID(), "ABC123",
            "Bramble Farm", new BigDecimal("12.5"));
        when(records.findBySlug("ABC123")).thenReturn(Optional.of(record));

        org.assertj.core.api.Assertions.assertThatThrownBy(
            () -> service.getBySlugIfPublic("ABC123"))
            .isInstanceOf(TraceNotFoundException.class);
    }

    @Test
    void get_by_slug_returns_record_when_publicly_visible() {
        var record = new TraceRecordEntity(
            UUID.randomUUID(), UUID.randomUUID(), "ABC123",
            "Bramble Farm", new BigDecimal("12.5"));
        record.setPublicVisible(true);
        when(records.findBySlug("ABC123")).thenReturn(Optional.of(record));

        var result = service.getBySlugIfPublic("ABC123");

        assertThat(result).isSameAs(record);
    }
}
