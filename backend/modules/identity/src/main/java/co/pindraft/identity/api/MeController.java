package co.pindraft.identity.api;

import co.pindraft.common.security.TenantContextHolder;
import co.pindraft.identity.domain.UserEntity;
import co.pindraft.identity.infrastructure.UserRepository;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.List;
import java.util.UUID;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/me")
@Tag(name = "Me", description = "Current user info")
public class MeController {

    private final TenantContextHolder contextHolder;
    private final UserRepository userRepository;

    public MeController(TenantContextHolder contextHolder, UserRepository userRepository) {
        this.contextHolder = contextHolder;
        this.userRepository = userRepository;
    }

    @GetMapping
    @Operation(summary = "Get the current authenticated user with their tenant relationships")
    public MeResponse me() {
        var ctx = contextHolder.get();
        if (!ctx.isAuthenticated()) {
            throw new UnauthenticatedException();
        }
        var user = userRepository.findById(ctx.userId())
            .orElseThrow(UnauthenticatedException::new);
        return new MeResponse(
            user.getId(),
            user.getEmail(),
            user.getName(),
            user.isPlatformAdmin(),
            ctx.staffMemberships().stream()
                .map(m -> new StaffMembership(m.tenantId(), m.role())).toList(),
            ctx.customerRelationships().stream()
                .map(c -> new CustomerRelationship(c.tenantId(), c.customerKind())).toList()
        );
    }

    public record MeResponse(
        UUID id, String email, String name, boolean isPlatformAdmin,
        List<StaffMembership> staffMemberships,
        List<CustomerRelationship> customerRelationships
    ) {}
    public record StaffMembership(UUID tenantId, String role) {}
    public record CustomerRelationship(UUID tenantId, String customerKind) {}

    static class UnauthenticatedException extends co.pindraft.common.error.PindraftException {
        public UnauthenticatedException() {
            super("unauthenticated", "No authenticated user", 401);
        }
    }
}
