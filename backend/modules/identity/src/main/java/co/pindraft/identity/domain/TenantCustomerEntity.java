package co.pindraft.identity.domain;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;
import org.jspecify.annotations.NullMarked;
import org.jspecify.annotations.Nullable;

/**
 * The relationship between a user (typically a shepherd or designer) and a mill tenant they
 * transact with. Distinct from {@link TenantMembershipEntity} (staff). A user can be both.
 *
 * <p>Walk-in customers may have {@code userId == null} — for fiber that arrives without an
 * existing Pindraft account. In that case {@code displayName} is required. Later, when the
 * customer claims a Pindraft account, the {@code userId} can be backfilled.
 *
 * <p>{@code externalSource} and {@code externalUserId} support reconciling identities with
 * external systems like Hirsel — see Hirsel integration spec.
 */
@Entity
@Table(name = "tenant_customers")
@NullMarked
public class TenantCustomerEntity {
    @Id
    @Column(name = "id", columnDefinition = "uuid")
    private UUID id;

    @Column(name = "user_id", columnDefinition = "uuid")
    @Nullable
    private UUID userId;

    @Column(name = "tenant_id", columnDefinition = "uuid", nullable = false)
    private UUID tenantId;

    @Column(name = "customer_kind", nullable = false)
    private String customerKind;

    @Column(name = "display_name")
    @Nullable
    private String displayName;

    @Column(name = "email")
    @Nullable
    private String email;

    @Column(name = "external_source") @Nullable
    private String externalSource;

    @Column(name = "external_user_id") @Nullable
    private String externalUserId;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    protected TenantCustomerEntity() {}

    /** Walk-in customer constructor. */
    public TenantCustomerEntity(UUID id, UUID tenantId, String customerKind, String displayName, @Nullable String email) {
        this.id = id;
        this.tenantId = tenantId;
        this.customerKind = customerKind;
        this.displayName = displayName;
        this.email = email;
        this.createdAt = Instant.now();
    }

    /** Linked-account customer constructor. */
    public TenantCustomerEntity(UUID id, UUID userId, UUID tenantId, String customerKind) {
        this.id = id;
        this.userId = userId;
        this.tenantId = tenantId;
        this.customerKind = customerKind;
        this.createdAt = Instant.now();
    }

    public UUID getId() { return id; }
    @Nullable public UUID getUserId() { return userId; }
    public UUID getTenantId() { return tenantId; }
    public String getCustomerKind() { return customerKind; }
    @Nullable public String getDisplayName() { return displayName; }
    @Nullable public String getEmail() { return email; }
    @Nullable public String getExternalSource() { return externalSource; }
    @Nullable public String getExternalUserId() { return externalUserId; }
    public Instant getCreatedAt() { return createdAt; }
}
