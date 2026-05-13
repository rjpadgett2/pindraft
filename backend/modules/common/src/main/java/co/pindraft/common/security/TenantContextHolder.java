package co.pindraft.common.security;

import org.springframework.stereotype.Component;
import org.springframework.web.context.annotation.RequestScope;

/**
 * Request-scoped holder for the current {@link TenantContext}. Populated by
 * {@code TenantContextFilter} in the identity module.
 *
 * <p>Inject this rather than passing {@code TenantContext} through method parameters.
 */
@Component
@RequestScope
public class TenantContextHolder {
    private TenantContext context = TenantContext.anonymous();

    public TenantContext get() {
        return context;
    }

    public void set(TenantContext context) {
        this.context = context;
    }
}
