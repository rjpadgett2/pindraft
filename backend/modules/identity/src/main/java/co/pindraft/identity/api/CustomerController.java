package co.pindraft.identity.api;

import co.pindraft.common.security.TenantAccessGuard;
import co.pindraft.identity.application.CustomerService;
import co.pindraft.identity.infrastructure.UserRepository;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/tenants/{tenantId}/customers")
@Tag(name = "Customers", description = "Tenant's customer relationships")
public class CustomerController {

    private final CustomerService service;
    private final UserRepository users;
    private final TenantAccessGuard accessGuard;

    public CustomerController(CustomerService service, UserRepository users, TenantAccessGuard accessGuard) {
        this.service = service;
        this.users = users;
        this.accessGuard = accessGuard;
    }

    @GetMapping("/user-lookup")
    @Operation(summary = "Operator: find a user by email to link to a walk-in customer. 404 when no match.")
    public ResponseEntity<UserLookupResponse> userLookup(
        @PathVariable UUID tenantId,
        @RequestParam @Email String email
    ) {
        accessGuard.requireStaffAccess(tenantId);
        return users.findByEmailIgnoreCase(email)
            .map(u -> ResponseEntity.ok(new UserLookupResponse(u.getId(), u.getEmail(), u.getName())))
            .orElseGet(() -> ResponseEntity.notFound().build());
    }

    public record UserLookupResponse(UUID id, String email, String name) {}

    @GetMapping
    @Operation(summary = "List customers for a tenant")
    public List<CustomerService.CustomerView> list(@PathVariable UUID tenantId) {
        accessGuard.requireStaffAccess(tenantId);
        return service.listForTenant(tenantId);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Create a walk-in customer (no Pindraft account required)")
    public CustomerService.CustomerView createWalkIn(
        @PathVariable UUID tenantId,
        @Valid @RequestBody CreateRequest req
    ) {
        accessGuard.requireStaffAccess(tenantId);
        return service.createWalkIn(tenantId, req.customerKind(), req.displayName(), req.email());
    }

    @PostMapping("/{customerId}/link")
    @Operation(summary = "Operator: attach an existing customer record to a user account")
    public CustomerService.CustomerView link(
        @PathVariable UUID tenantId,
        @PathVariable UUID customerId,
        @Valid @RequestBody LinkRequest req
    ) {
        accessGuard.requireStaffAccess(tenantId);
        return service.linkToUser(tenantId, customerId, req.userId());
    }

    @DeleteMapping("/{customerId}/link")
    @Operation(summary = "Operator: detach a customer record from its user account")
    public CustomerService.CustomerView unlink(
        @PathVariable UUID tenantId,
        @PathVariable UUID customerId
    ) {
        accessGuard.requireStaffAccess(tenantId);
        return service.unlink(tenantId, customerId);
    }

    @PostMapping("/{customerId}/claim-code")
    @Operation(summary = "Operator: issue a one-time code the customer can redeem in their portal")
    public CustomerService.ClaimCodeView issueClaimCode(
        @PathVariable UUID tenantId,
        @PathVariable UUID customerId
    ) {
        accessGuard.requireStaffAccess(tenantId);
        return service.generateClaimCode(tenantId, customerId);
    }

    public record CreateRequest(
        @NotBlank String customerKind,
        @NotBlank String displayName,
        @Email String email
    ) {}

    public record LinkRequest(@jakarta.validation.constraints.NotNull UUID userId) {}
}
