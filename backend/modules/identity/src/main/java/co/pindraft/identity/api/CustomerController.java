package co.pindraft.identity.api;

import co.pindraft.common.security.TenantAccessGuard;
import co.pindraft.identity.application.CustomerService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/tenants/{tenantId}/customers")
@Tag(name = "Customers", description = "Tenant's customer relationships")
public class CustomerController {

    private final CustomerService service;
    private final TenantAccessGuard accessGuard;

    public CustomerController(CustomerService service, TenantAccessGuard accessGuard) {
        this.service = service;
        this.accessGuard = accessGuard;
    }

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

    public record CreateRequest(
        @NotBlank String customerKind,
        @NotBlank String displayName,
        @Email String email
    ) {}
}
