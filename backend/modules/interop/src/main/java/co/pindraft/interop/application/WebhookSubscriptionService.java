package co.pindraft.interop.application;

import co.pindraft.interop.domain.WebhookSubscriptionEntity;
import co.pindraft.interop.infrastructure.WebhookSubscriptionRepository;
import java.security.SecureRandom;
import java.util.Base64;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class WebhookSubscriptionService {

    private static final SecureRandom RANDOM = new SecureRandom();
    private final WebhookSubscriptionRepository repo;

    public WebhookSubscriptionService(WebhookSubscriptionRepository repo) {
        this.repo = repo;
    }

    public List<WebhookSubscriptionEntity> listForTenant(UUID tenantId) {
        return repo.findByTenantIdAndActiveTrue(tenantId);
    }

    public List<WebhookSubscriptionEntity> findActiveSubscribers(UUID tenantId, String eventType) {
        return repo.findByTenantIdAndEventTypeAndActiveTrue(tenantId, eventType);
    }

    /** Direct lookup by subscription ID — used by the dispatcher to send a queued delivery. */
    public Optional<WebhookSubscriptionEntity> findById(UUID id) {
        return repo.findById(id);
    }

    @Transactional
    public WebhookSubscriptionEntity create(UUID tenantId, String eventType, String deliveryUrl) {
        var signingSecret = generateSecret();
        var sub = new WebhookSubscriptionEntity(
            UUID.randomUUID(), tenantId, eventType, deliveryUrl, signingSecret);
        return repo.save(sub);
    }

    @Transactional
    public void deactivate(UUID tenantId, UUID id) {
        var sub = repo.findById(id).orElseThrow();
        if (!sub.getTenantId().equals(tenantId)) throw new IllegalArgumentException("not your subscription");
        sub.deactivate();
        repo.save(sub);
    }

    private String generateSecret() {
        var bytes = new byte[32];
        RANDOM.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }
}
