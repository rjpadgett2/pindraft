package co.pindraft.identity.infrastructure;

import java.util.Arrays;
import java.util.List;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.annotation.Order;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

/**
 * Two filter chains:
 *
 * <ol>
 *   <li>Order 0: {@code /api/v1/interop/**} — bearer token (v1 pdt_* OR OAuth oat_*)
 *       via InteropAuthFilter.</li>
 *   <li>Order 1: everything else — user JWT via JwtAuthenticationFilter.</li>
 * </ol>
 *
 * <p>CORS allowed origins are read from {@code pindraft.cors.allowed-origins} as a
 * comma-separated list. Defaults to the three local Angular dev servers when running
 * locally; production sets this to the deployed origins (e.g. https://app.pindraft.co).
 */
@Configuration
public class SecurityConfig {

    private final List<String> corsAllowedOrigins;

    public SecurityConfig(@Value("${pindraft.cors.allowed-origins}") String corsAllowedOriginsCsv) {
        this.corsAllowedOrigins = Arrays.stream(corsAllowedOriginsCsv.split(","))
            .map(String::trim)
            .filter(s -> !s.isEmpty())
            .toList();
    }

    @Bean
    @Order(0)
    public SecurityFilterChain interopFilterChain(HttpSecurity http) throws Exception {
        http
            .securityMatcher("/api/v1/interop/**")
            .cors(c -> c.configurationSource(corsConfigurationSource()))
            .csrf(AbstractHttpConfigurer::disable)
            .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(auth -> auth.anyRequest().permitAll());
        return http.build();
    }

    @Bean
    @Order(1)
    public SecurityFilterChain filterChain(HttpSecurity http, JwtAuthenticationFilter jwtFilter) throws Exception {
        http
            .cors(c -> c.configurationSource(corsConfigurationSource()))
            .csrf(AbstractHttpConfigurer::disable)
            .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/api/v1/auth/**").permitAll()
                .requestMatchers("/api/v1/bootstrap/**").permitAll()
                .requestMatchers("/api/v1/public/**").permitAll()
                // Invitation lookup + accept must work pre-login — the recipient
                // doesn't have a session yet. Admin-side create/revoke under
                // /api/v1/tenants/{id}/invitations stays authenticated.
                .requestMatchers("/api/v1/invitations/*").permitAll()
                .requestMatchers("/api/v1/invitations/*/accept").permitAll()
                .requestMatchers("/api/v1/oauth/authorize").permitAll()
                .requestMatchers("/api/v1/oauth/token").permitAll()
                .requestMatchers("/api/v1/oauth/revoke").permitAll()
                .requestMatchers("/.well-known/**").permitAll()
                .requestMatchers("/v3/api-docs/**", "/swagger-ui/**", "/swagger-ui.html").permitAll()
                .requestMatchers("/actuator/health", "/actuator/info").permitAll()
                .anyRequest().authenticated()
            )
            .addFilterBefore(jwtFilter, UsernamePasswordAuthenticationFilter.class);
        return http.build();
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder(12);
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        var config = new CorsConfiguration();
        config.setAllowedOrigins(corsAllowedOrigins);
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        config.setAllowedHeaders(List.of("*"));
        config.setAllowCredentials(true);

        var source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return source;
    }
}
