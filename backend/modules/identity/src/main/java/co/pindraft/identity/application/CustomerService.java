package co.pindraft.identity.application;

import co.pindraft.identity.domain.TenantCustomerEntity;
import co.pindraft.identity.infrastructure.TenantCustomerRepository;
import co.pindraft.identity.infrastructure.UserRepository;
import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.jspecify.annotations.NullMarked;
import org.jspecify.annotations.Nullable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Tenant customer admin. Owns walk-in customer creation, the listing view for the
 * ops-console, and the user-account linking lifecycle (auto-link on registration,
 * operator manual link, customer-portal claim codes).
 */
@Service
@NullMarked
public class CustomerService {

    /** How long a generated claim code stays redeemable. Spec-level decision: 7 days. */
    private static final Duration CLAIM_CODE_TTL = Duration.ofDays(7);

    /**
     * Code alphabet: uppercase letters and digits, minus visually-ambiguous chars
     * (0/O, 1/I/L). 30 chars × 8 positions = ~6.6×10^11 combinations, plenty
     * for the small number of active codes at any one time.
     */
    private static final char[] CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789".toCharArray();
    private static final int CODE_LENGTH = 8;

    private final TenantCustomerRepository customers;
    private final UserRepository users;
    private final SecureRandom random = new SecureRandom();

    public CustomerService(TenantCustomerRepository customers, UserRepository users) {
        this.customers = customers;
        this.users = users;
    }

    public List<CustomerView> listForTenant(UUID tenantId) {
        return customers.findByTenantIdOrderByDisplayName(tenantId).stream()
            .map(this::toView)
            .toList();
    }

    /**
     * Create a walk-in customer record. If {@code email} is supplied and matches an
     * existing user account, auto-link {@code user_id} so the customer sees this lot
     * in their portal without any extra action.
     */
    @Transactional
    public CustomerView createWalkIn(UUID tenantId, String customerKind, String displayName, @Nullable String email) {
        var entity = new TenantCustomerEntity(
            UUID.randomUUID(), tenantId, customerKind, displayName, email);
        if (email != null && !email.isBlank()) {
            users.findByEmailIgnoreCase(email).ifPresent(u -> entity.linkToUser(u.getId()));
        }
        customers.save(entity);
        return toView(entity);
    }

    /**
     * Backfill {@code user_id} on any walk-in customer records whose email matches the
     * given address. Called at registration so a freshly-registered shepherd
     * immediately sees lots that mills had already created walk-ins for. Returns the
     * count of records linked so the caller can report back to the user.
     */
    @Transactional
    public int autoLinkOnRegistration(UUID userId, String email) {
        var matches = customers.findByEmailIgnoreCaseAndUserIdIsNull(email);
        for (var c : matches) c.linkToUser(userId);
        if (!matches.isEmpty()) customers.saveAll(matches);
        return matches.size();
    }

    /**
     * Operator action: attach an existing walk-in customer record to a user account.
     * Used when the email wasn't on file (or differed) and the operator confirms the
     * identity out-of-band. Idempotent for the same user; refuses re-linking to a
     * different user — the operator must explicitly unlink first.
     */
    @Transactional
    public CustomerView linkToUser(UUID tenantId, UUID customerId, UUID userId) {
        var customer = customers.findById(customerId)
            .orElseThrow(() -> new IllegalArgumentException("Customer not found: " + customerId));
        if (!customer.getTenantId().equals(tenantId)) {
            throw new IllegalArgumentException("Customer does not belong to this tenant");
        }
        if (customer.getUserId() != null && !customer.getUserId().equals(userId)) {
            throw new IllegalStateException("Customer is already linked to a different user — unlink first");
        }
        if (users.findById(userId).isEmpty()) {
            throw new IllegalArgumentException("User not found: " + userId);
        }
        customer.linkToUser(userId);
        customers.save(customer);
        return toView(customer);
    }

    /** Operator action: clear a mistaken link so the record can be re-linked. */
    @Transactional
    public CustomerView unlink(UUID tenantId, UUID customerId) {
        var customer = customers.findById(customerId)
            .orElseThrow(() -> new IllegalArgumentException("Customer not found: " + customerId));
        if (!customer.getTenantId().equals(tenantId)) {
            throw new IllegalArgumentException("Customer does not belong to this tenant");
        }
        customer.unlinkUser();
        customers.save(customer);
        return toView(customer);
    }

    /**
     * Operator action: generate a one-time claim code the customer can redeem to
     * attach their user account. Refuses if the record is already linked (no code
     * needed) or if the code clashes with another active code (extremely unlikely
     * given the alphabet, but retried up to a few times).
     */
    @Transactional
    public ClaimCodeView generateClaimCode(UUID tenantId, UUID customerId) {
        var customer = customers.findById(customerId)
            .orElseThrow(() -> new IllegalArgumentException("Customer not found: " + customerId));
        if (!customer.getTenantId().equals(tenantId)) {
            throw new IllegalArgumentException("Customer does not belong to this tenant");
        }
        if (customer.getUserId() != null) {
            throw new IllegalStateException("Customer is already linked — no claim code needed");
        }
        // Retry on the off chance the unique index rejects a collision.
        String code = null;
        for (int attempt = 0; attempt < 5 && code == null; attempt++) {
            var candidate = randomCode();
            if (customers.findByClaimCode(candidate).isEmpty()) code = candidate;
        }
        if (code == null) throw new IllegalStateException("Could not allocate a unique claim code");
        var expires = Instant.now().plus(CLAIM_CODE_TTL);
        customer.issueClaimCode(code, expires);
        customers.save(customer);
        return new ClaimCodeView(customer.getId(), code, expires);
    }

    /**
     * Customer-portal action: redeem a claim code to attach this user account to the
     * customer record. The code is single-use — cleared on success.
     */
    @Transactional
    public CustomerView claimByCode(UUID userId, String code) {
        var normalized = code == null ? "" : code.trim().toUpperCase();
        if (normalized.isEmpty()) throw new IllegalArgumentException("Code is required");
        var customer = customers.findByClaimCode(normalized)
            .orElseThrow(() -> new IllegalArgumentException("Code not recognized"));
        if (!customer.hasActiveClaimCode(Instant.now())) {
            throw new IllegalArgumentException("Code has expired — ask the mill for a new one");
        }
        if (customer.getUserId() != null) {
            // Shouldn't happen — linkToUser clears the code — but defend against races.
            throw new IllegalStateException("Customer is already linked");
        }
        customer.linkToUser(userId);
        customers.save(customer);
        return toView(customer);
    }

    private String randomCode() {
        var sb = new StringBuilder(CODE_LENGTH);
        for (int i = 0; i < CODE_LENGTH; i++) sb.append(CODE_ALPHABET[random.nextInt(CODE_ALPHABET.length)]);
        return sb.toString();
    }

    private CustomerView toView(TenantCustomerEntity entity) {
        return new CustomerView(
            entity.getId(), entity.getUserId(), entity.getCustomerKind(), entity.getDisplayName(),
            entity.getEmail(), entity.getExternalSource(),
            entity.getClaimCode(), entity.getClaimCodeExpiresAt());
    }

    public record CustomerView(
        UUID id, @Nullable UUID userId, String customerKind, String displayName,
        @Nullable String email, @Nullable String externalSource,
        @Nullable String activeClaimCode, @Nullable Instant claimCodeExpiresAt) {}

    public record ClaimCodeView(UUID customerId, String code, Instant expiresAt) {}
}
