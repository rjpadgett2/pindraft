package co.pindraft.identity.api;

import co.pindraft.identity.application.AuthService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/auth")
@Tag(name = "Auth", description = "Login, refresh, logout")
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/login")
    @Operation(summary = "Login with email and password")
    public TokenResponse login(@Valid @RequestBody LoginRequest req) {
        var tokens = authService.login(req.email(), req.password());
        return new TokenResponse(tokens.accessToken(), tokens.refreshToken());
    }

    @PostMapping("/register")
    @Operation(summary = "Public registration. Creates a user with no tenant relationships and auto-logs them in. Shepherds and designers use this; new mill setup is separate.")
    public TokenResponse register(@Valid @RequestBody RegisterRequest req) {
        var tokens = authService.register(req.email(), req.password(), req.name());
        return new TokenResponse(tokens.accessToken(), tokens.refreshToken());
    }

    @PostMapping("/refresh")
    @Operation(summary = "Refresh access token using a refresh token")
    public TokenResponse refresh(@Valid @RequestBody RefreshRequest req) {
        var tokens = authService.refresh(req.refreshToken());
        return new TokenResponse(tokens.accessToken(), tokens.refreshToken());
    }

    @PostMapping("/logout")
    @Operation(summary = "Revoke a refresh token")
    public void logout(@Valid @RequestBody RefreshRequest req) {
        authService.logout(req.refreshToken());
    }

    public record LoginRequest(@Email @NotBlank String email, @NotBlank String password) {}
    public record RegisterRequest(
        @Email @NotBlank String email,
        @NotBlank String password,
        @NotBlank String name) {}
    public record RefreshRequest(@NotBlank String refreshToken) {}
    public record TokenResponse(String accessToken, String refreshToken) {}
}
