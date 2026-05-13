package co.pindraft.interop.infrastructure;

import co.pindraft.interop.domain.WebhookDeliveryEntity;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface WebhookDeliveryRepository extends JpaRepository<WebhookDeliveryEntity, UUID> {

    /** Find deliveries due for sending now (PENDING or RETRY, nextAttemptAt past). */
    @Query("SELECT d FROM WebhookDeliveryEntity d " +
           "WHERE d.status IN ('PENDING', 'RETRY') AND d.nextAttemptAt <= :now " +
           "ORDER BY d.nextAttemptAt ASC")
    List<WebhookDeliveryEntity> findDue(@Param("now") Instant now);
}
