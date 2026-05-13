package co.pindraft.interop.oauth.application;

import co.pindraft.interop.oauth.domain.OAuthClientEntity;
import co.pindraft.interop.oauth.infrastructure.OAuthClientRepository;
import tools.jackson.core.type.TypeReference;
import tools.jackson.databind.ObjectMapper;
import java.security.SecureRandom;
import java.util.Base64;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * OAuth client lifecycle (registration, retrieval). Client secrets are returned only at
 * registration; subsequent reads expose just the metadata.
 */
@Service
public class OAuthClientService {

    private static final SecureRandom RANDOM = new SecureRandom();
    private final OAuthClientRepository repo;
    private final PasswordEncoder passwordEncoder;
    private final ObjectMapper mapper;

    public OAuthClientService(OAuthClientRepository repo, PasswordEncoder passwordEncoder, ObjectMapper mapper) {
        this.repo = repo;
        this.passwordEncoder = passwordEncoder;
        this.mapper = mapper;
    }

    public Optional<OAuthClientEntity> findActive(UUID id) {
        return repo.findByIdAndActiveTrue(id);
    }

    /**
     * Registers a new OAuth client. Returns the entity plus the plaintext secret —
     * the only time the secret is ever returned.
     */
    @Transactional
    public RegisteredClient register(UUID tenantId, String name, List<String> redirectUris, boolean pkceRequired) {
        var plainSecret = generateSecret();
        var hash = passwordEncoder.encode(plainSecret);
        String redirectUrisJson;
        try {
            redirectUrisJson = mapper.writeValueAsString(redirectUris);
        } catch (Exception e) {
            throw new IllegalArgumentException("redirect_uris must be valid JSON", e);
        }
        var entity = new OAuthClientEntity(
            UUID.randomUUID(), tenantId, name, hash, redirectUrisJson, pkceRequired);
        repo.save(entity);
        return new RegisteredClient(entity, plainSecret);
    }

    /** Returns true if the supplied plaintext secret matches the stored hash. */
    public boolean verifySecret(OAuthClientEntity client, String plainSecret) {
        return passwordEncoder.matches(plainSecret, client.getClientSecretHash());
    }

    /** Validates a redirect URI exactly matches one of the registered URIs. */
    public boolean isRedirectUriAllowed(OAuthClientEntity client, String redirectUri) {
        try {
            List<String> registered = mapper.readValue(client.getRedirectUrisJson(), new TypeReference<>() {});
            return registered.contains(redirectUri);
        } catch (Exception e) {
            return false;
        }
    }

    private String generateSecret() {
        var bytes = new byte[32];
        RANDOM.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    public record RegisteredClient(OAuthClientEntity client, String plainSecret) {}
}
