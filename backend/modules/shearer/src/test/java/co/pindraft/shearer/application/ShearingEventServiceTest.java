package co.pindraft.shearer.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import co.pindraft.shearer.domain.ShearingEventEntity;
import co.pindraft.shearer.infrastructure.ShearingEventRepository;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class ShearingEventServiceTest {

    @Mock private ShearingEventRepository repo;
    private ShearingEventService service;
    private UUID shearerId;

    @BeforeEach
    void setUp() {
        service = new ShearingEventService(repo);
        shearerId = UUID.randomUUID();
    }

    @Test
    void record_creates_a_new_event_when_no_local_id() {
        when(repo.save(any(ShearingEventEntity.class))).thenAnswer(inv -> inv.getArgument(0));

        var event = service.record(
            shearerId, null, "Bramble", null, "ROMNEY",
            new BigDecimal("3.8"), Instant.now(), "North paddock", null);

        assertThat(event.getShearerUserId()).isEqualTo(shearerId);
        assertThat(event.getAnimalName()).isEqualTo("Bramble");
        assertThat(event.getFleeceWeightKg()).isEqualByComparingTo("3.8");
        verify(repo).save(any(ShearingEventEntity.class));
    }

    @Test
    void record_returns_existing_event_when_local_id_already_synced() {
        var existing = new ShearingEventEntity(
            UUID.randomUUID(), shearerId, "Bramble", Instant.now());
        existing.setClientLocalId("local-42");
        when(repo.findByShearerUserIdAndClientLocalId(shearerId, "local-42"))
            .thenReturn(Optional.of(existing));

        var event = service.record(
            shearerId, "local-42", "Bramble", null, "ROMNEY",
            new BigDecimal("3.8"), Instant.now(), null, null);

        assertThat(event).isSameAs(existing);
        verify(repo, never()).save(any(ShearingEventEntity.class));
    }
}
