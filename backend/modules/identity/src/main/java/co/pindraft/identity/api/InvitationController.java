package co.pindraft.identity.api;

import co.pindraft.common.security.TenantAccessGuard;
import co.pindraft.common.security.TenantContextHolder;
import co.pindraft.identity.application.InvitationService;
import co.pindraft.identity.domain.InvitationStatus;
import co.pindraft.identity.domain.TenantInvitationEntity;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.jspecify.annotations.Nullable;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

/**
 * Operator invitation flow. Two surfaces:
 *
 * <ul>
 *   <li>{@code /api/v1/tenants/{tenantId}/invitations} — admin-scoped CRUD-ish
 *       (create, list, revoke). Staff access required.</li>
 *   <li>{@code /api/v1/invitations/{token}} — public token lookup + accept. No
 *       auth, since the recipient hasn't logged in yet.</li>
 * </ul>
 */
@RestController
@Tag(name = "Invitations", description = "Operator invitations for a tenant")
public class InvitationController {

    private final InvitationService service;
    private final TenantAccessGuard accessGuard;
    private final TenantContextHolder contextHolder;

    public InvitationController(InvitationService service,
                                TenantAccessGuard accessGuard,
                                TenantContextHolder contextHolder) {
        this.service = service;
        this.accessGuard = accessGuard;
        this.contextHolder = contextHolder;
    }

    @PostMapping("/api/v1/tenants/{tenantId}/invitations")
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Invite a person to join this tenant. Returns the token URL exactly once.")
    public InvitationCreatedResponse invite(
        @PathVariable UUID tenantId,
        @Valid @RequestBody InviteRequest req
    ) {
        accessGuard.requireStaffAccess(tenantId);
        var inviter = contextHolder.get().userId();
        if (inviter == null) throw new IllegalStateException("inviter must be authenticated");
        var result = service.invite(tenantId, req.email(), req.role(), inviter);
        return new InvitationCreatedResponse(
            toResponse(result.invitation()),
            result.plaintextToken());
    }

    @GetMapping("/api/v1/tenants/{tenantId}/invitations")
    @Operation(summary = "List invitations for a tenant (admin view)")
    public List<InvitationResponse> list(@PathVariable UUID tenantId) {
        accessGuard.requireStaffAccess(tenantId);
        return service.listForTenant(tenantId).stream().map(InvitationController::toResponse).toList();
    }

    @PostMapping("/api/v1/tenants/{tenantId}/invitations/{id}/revoke")
    @Operation(summary = "Revoke a pending invitation")
    public InvitationResponse revoke(@PathVariable UUID tenantId, @PathVariable UUID id) {
        accessGuard.requireStaffAccess(tenantId);
        return toResponse(service.revoke(id));
    }

    @GetMapping("/api/v1/invitations/{token}")
    @Operation(summary = "Public lookup of an invitation by token — used by the accept page")
    public InvitationPublicInfo lookup(@PathVariable String token) {
        var inv = service.findByToken(token);
        return new InvitationPublicInfo(
            inv.getTenantId(), inv.getEmail(), inv.getRole(),
            inv.getStatus(), inv.getExpiresAt());
    }

    @PostMapping("/api/v1/invitations/{token}/accept")
    @Operation(summary = "Accept an invitation. Creates the user account if it doesn't already exist.")
    public AcceptResponse accept(@PathVariable String token, @Valid @RequestBody AcceptRequest req) {
        var result = service.accept(token, new InvitationService.AcceptInput(req.password(), req.name()));
        return new AcceptResponse(result.userId(), result.tenantId(), result.role());
    }

    private static InvitationResponse toResponse(TenantInvitationEntity i) {
        return new InvitationResponse(
            i.getId(), i.getTenantId(), i.getEmail(), i.getRole(),
            i.getStatus(), i.getExpiresAt(), i.getAcceptedAt(),
            i.getInvitedBy(), i.getCreatedAt());
    }

    public record InviteRequest(@NotBlank @Email String email, @NotBlank String role) {}

    public record AcceptRequest(@Nullable String password, @Nullable String name) {}

    public record InvitationResponse(
        UUID id, UUID tenantId, String email, String role,
        InvitationStatus status, Instant expiresAt, Instant acceptedAt,
        UUID invitedBy, Instant createdAt) {}

    public record InvitationCreatedResponse(InvitationResponse invitation, String acceptTokenPlaintext) {}

    public record InvitationPublicInfo(
        UUID tenantId, String email, String role,
        InvitationStatus status, Instant expiresAt) {}

    public record AcceptResponse(UUID userId, UUID tenantId, String role) {}
}
