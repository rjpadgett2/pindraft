package co.pindraft.common.security;

import java.util.UUID;
import co.pindraft.common.error.PindraftException;

public class TenantAccessDeniedException extends PindraftException {
    public TenantAccessDeniedException(UUID tenantId, String mode) {
        super(
            "tenant_access_denied",
            "Access denied to tenant " + tenantId + " (requested mode: " + mode + ")",
            403
        );
    }
}
