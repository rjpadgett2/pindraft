/**
 * Pindraft interop module — Hirsel and other-system integration.
 *
 * <p>Implements OAuth 2.1 + PKCE, idempotent manifest ingest, and webhook dispatch
 * for lifecycle events from mill-ops, pools, and marketplace.
 */
@org.springframework.modulith.ApplicationModule(
    displayName = "Interop",
    allowedDependencies = { "common", "identity", "mill-ops", "pools", "marketplace" }
)
package co.pindraft.interop;
