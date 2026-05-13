package co.pindraft.identity.application;

import co.pindraft.identity.domain.TenantCustomerEntity;
import co.pindraft.identity.infrastructure.TenantCustomerRepository;
import co.pindraft.identity.infrastructure.UserRepository;
import java.util.List;
import java.util.UUID;
import org.jspecify.annotations.NullMarked;
import org.jspecify.annotations.Nullable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Tenant customer admin. Owns walk-in customer creation and the listing view for the
 * ops-console.
 */
@Service
@NullMarked
public class CustomerService {

    private final TenantCustomerRepository customers;
    private final UserRepository users;

    public CustomerService(TenantCustomerRepository customers, UserRepository users) {
        this.customers = customers;
        this.users = users;
    }

    public List<CustomerView> listForTenant(UUID tenantId) {
        return customers.findByTenantIdOrderByDisplayName(tenantId).stream()
            .map(this::toView)
            .toList();
    }

    @Transactional
    public CustomerView createWalkIn(UUID tenantId, String customerKind, String displayName, @Nullable String email) {
        var entity = new TenantCustomerEntity(
            UUID.randomUUID(), tenantId, customerKind, displayName, email);
        customers.save(entity);
        return toView(entity);
    }

    private CustomerView toView(TenantCustomerEntity entity) {
        return new CustomerView(
            entity.getId(), entity.getCustomerKind(), entity.getDisplayName(),
            entity.getEmail(), entity.getExternalSource());
    }

    public record CustomerView(
        UUID id, String customerKind, String displayName,
        @Nullable String email, @Nullable String externalSource) {}
}
