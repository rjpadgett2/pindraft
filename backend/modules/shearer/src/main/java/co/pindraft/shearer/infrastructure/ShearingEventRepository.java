package co.pindraft.shearer.infrastructure;

import co.pindraft.shearer.domain.ShearingEventEntity;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ShearingEventRepository extends JpaRepository<ShearingEventEntity, UUID> {
    List<ShearingEventEntity> findByShearerUserIdOrderByShornAtDesc(UUID shearerUserId);

    /** Idempotency lookup: did this client already sync this local row? */
    Optional<ShearingEventEntity> findByShearerUserIdAndClientLocalId(UUID shearerUserId, String clientLocalId);
}
