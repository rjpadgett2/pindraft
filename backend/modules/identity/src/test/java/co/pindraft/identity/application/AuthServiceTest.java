package co.pindraft.identity.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyBoolean;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.Mockito.when;

import co.pindraft.identity.domain.RefreshTokenEntity;
import co.pindraft.identity.domain.UserEntity;
import co.pindraft.identity.infrastructure.*;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

/**
 * Sample unit test showing the testing convention for Pindraft.
 *
 * <ul>
 *   <li>Service under test: real instance, mocked collaborators via Mockito.</li>
 *   <li>JUnit 5 + Mockito + AssertJ.</li>
 *   <li>One behavior per test method; the method name reads as a sentence.</li>
 *   <li>Arrange / Act / Assert visually separated by blank lines.</li>
 * </ul>
 */
@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

    @Mock private UserRepository users;
    @Mock private co.pindraft.identity.infrastructure.TenantRepository tenants;
    @Mock private TenantMembershipRepository memberships;
    @Mock private TenantCustomerRepository customers;
    @Mock private RefreshTokenRepository refreshTokens;
    @Mock private PasswordEncoder passwordEncoder;
    @Mock private JwtService jwtService;

    private AuthService authService;

    @BeforeEach
    void setUp() {
        authService = new AuthService(
            users, tenants, memberships, customers, refreshTokens,
            passwordEncoder, jwtService, 86400L);
    }

    @Test
    void login_with_valid_credentials_returns_token_pair() {
        var userId = UUID.randomUUID();
        var user = new UserEntity(userId, "test@example.com", "hashed", "Test", false);
        when(users.findByEmailIgnoreCase("test@example.com")).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("password", "hashed")).thenReturn(true);
        when(memberships.findByUserId(userId)).thenReturn(List.of());
        when(customers.findByUserId(userId)).thenReturn(List.of());
        when(jwtService.issueAccessToken(any(), anyBoolean(), anyList(), anyList()))
            .thenReturn("access-token");
        when(refreshTokens.save(any(RefreshTokenEntity.class)))
            .thenAnswer(inv -> inv.getArgument(0));

        var tokens = authService.login("test@example.com", "password");

        assertThat(tokens.accessToken()).isEqualTo("access-token");
        assertThat(tokens.refreshToken()).isNotBlank();
    }

    @Test
    void login_with_wrong_password_throws_invalid_credentials() {
        var user = new UserEntity(UUID.randomUUID(), "test@example.com", "hashed", "Test", false);
        when(users.findByEmailIgnoreCase("test@example.com")).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("wrong", "hashed")).thenReturn(false);

        assertThatThrownBy(() -> authService.login("test@example.com", "wrong"))
            .isInstanceOf(InvalidCredentialsException.class);
    }

    @Test
    void login_with_unknown_email_throws_invalid_credentials() {
        when(users.findByEmailIgnoreCase("ghost@example.com")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> authService.login("ghost@example.com", "anything"))
            .isInstanceOf(InvalidCredentialsException.class);
    }
}
