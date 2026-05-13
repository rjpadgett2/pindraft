package co.pindraft.identity.domain;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;
import org.jspecify.annotations.NullMarked;
import org.jspecify.annotations.Nullable;

@Entity
@Table(name = "tenants")
@NullMarked
public class TenantEntity {
    @Id
    @Column(name = "id", columnDefinition = "uuid")
    private UUID id;

    @Column(name = "name", nullable = false)
    private String name;

    @Enumerated(EnumType.STRING)
    @Column(name = "kind", nullable = false)
    private TenantKind kind;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    private TenantStatus status;

    @Column(name = "default_unit", nullable = false, length = 2)
    private String defaultUnit;

    @Column(name = "time_zone", nullable = false)
    private String timeZone;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    protected TenantEntity() {}

    public TenantEntity(UUID id, String name, TenantKind kind) {
        this.id = id;
        this.name = name;
        this.kind = kind;
        this.status = TenantStatus.SETUP;
        this.defaultUnit = "kg";
        this.timeZone = "America/New_York";
        var now = Instant.now();
        this.createdAt = now;
        this.updatedAt = now;
    }

    public UUID getId() { return id; }
    public String getName() { return name; }
    public TenantKind getKind() { return kind; }
    public TenantStatus getStatus() { return status; }
    public String getDefaultUnit() { return defaultUnit; }
    public String getTimeZone() { return timeZone; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }

    public void transitionTo(TenantStatus newStatus) {
        this.status = newStatus;
        this.updatedAt = Instant.now();
    }

    public void updateProfile(@Nullable String name, @Nullable String defaultUnit, @Nullable String timeZone) {
        if (name != null && !name.isBlank()) this.name = name;
        if (defaultUnit != null && (defaultUnit.equals("kg") || defaultUnit.equals("lb"))) {
            this.defaultUnit = defaultUnit;
        }
        if (timeZone != null && !timeZone.isBlank()) this.timeZone = timeZone;
        this.updatedAt = Instant.now();
    }
}
