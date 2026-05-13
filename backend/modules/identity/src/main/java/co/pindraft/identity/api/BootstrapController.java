package co.pindraft.identity.api;

import co.pindraft.identity.application.BootstrapService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.util.UUID;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/bootstrap")
@Tag(name = "Bootstrap", description = "One-time setup endpoints (dev only)")
public class BootstrapController {

    private final BootstrapService bootstrapService;

    public BootstrapController(BootstrapService bootstrapService) {
        this.bootstrapService = bootstrapService;
    }

    @PostMapping("/admin")
    @Operation(summary = "Create the first platform admin and tenant. Disabled in production.")
    public BootstrapResponse createFirstAdmin(@Valid @RequestBody Request req) {
        var result = bootstrapService.createFirstAdmin(
            req.email(), req.password(), req.name(), req.tenantName());
        return new BootstrapResponse(result.userId(), result.tenantId());
    }

    public record Request(
        @Email @NotBlank String email,
        @NotBlank @Size(min = 8) String password,
        @NotBlank String name,
        @NotBlank String tenantName
    ) {}

    public record BootstrapResponse(UUID userId, UUID tenantId) {}
}
