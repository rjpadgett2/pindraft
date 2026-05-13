package co.pindraft.interop.infrastructure;

import co.pindraft.interop.domain.WebhookSubscriptionEntity;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface WebhookSubscriptionRepository extends JpaRepository<WebhookSubscriptionEntity, UUID> {
    List<WebhookSubscriptionEntity> findByTenantIdAndActiveTrue(UUID tenantId);
    List<WebhookSubscriptionEntity> findByTenantIdAndEventTypeAndActiveTrue(UUID tenantId, String eventType);
}
