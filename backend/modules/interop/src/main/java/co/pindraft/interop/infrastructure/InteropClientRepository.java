package co.pindraft.interop.infrastructure;

import co.pindraft.interop.domain.InteropClientEntity;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface InteropClientRepository extends JpaRepository<InteropClientEntity, UUID> {
    Optional<InteropClientEntity> findByIdAndActiveTrue(UUID id);
    List<InteropClientEntity> findByTenantIdAndActiveTrue(UUID tenantId);
}
