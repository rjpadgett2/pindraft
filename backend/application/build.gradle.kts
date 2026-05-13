plugins {
    id("org.springframework.boot")
    id("io.spring.dependency-management")
    id("org.openapi.generator") version "7.16.0"
}

dependencies {
    implementation(project(":modules:common"))
    implementation(project(":modules:identity"))
    implementation(project(":modules:mill-ops"))
    implementation(project(":modules:billing"))
    implementation(project(":modules:traceability"))
    implementation(project(":modules:marketplace"))
    implementation(project(":modules:interop"))
    implementation(project(":modules:pools"))
    implementation(project(":modules:shearer"))

    implementation("org.springframework.boot:spring-boot-starter-web")
    implementation("org.springframework.boot:spring-boot-starter-actuator")
    implementation("org.springdoc:springdoc-openapi-starter-webmvc-ui:2.8.0")

    // Flyway: required for Spring Boot's auto-run-migrations behavior. flyway-core gives
    // us the engine; flyway-database-postgresql provides Postgres dialect support (split
    // out into a separate jar starting Flyway 10). spring-boot-flyway is the autoconfig
    // module — in Spring Boot 4.x autoconfig was split out of the monolithic
    // spring-boot-autoconfigure jar into per-area jars (spring-boot-jpa,
    // spring-boot-hibernate, spring-boot-flyway, …) and none of the JPA starters
    // transitively pull spring-boot-flyway, so it has to be declared here for
    // `spring.flyway.enabled: true` to actually wire up. Versions are managed by the
    // Spring Boot BOM applied in the root build.gradle.kts.
    implementation("org.springframework.boot:spring-boot-flyway")
    implementation("org.flywaydb:flyway-core")
    implementation("org.flywaydb:flyway-database-postgresql")

    testImplementation("org.springframework.boot:spring-boot-starter-test")
}

// Run the Spring Boot app with the repo root as the working directory so that
// `spring.config.import: optional:file:./.env[.properties]` in application.yml
// resolves to <repo>/.env. Without this override the JVM cwd defaults to
// backend/application/, and the .env file silently goes unread.
tasks.named<org.springframework.boot.gradle.tasks.run.BootRun>("bootRun") {
    workingDir = file("$rootDir/..")
}

/**
 * OpenAPI generation workflow:
 *
 *   1. Start backend locally: `./gradlew :application:bootRun`
 *   2. Wait for it to be up (springdoc serves at /v3/api-docs)
 *   3. Run: `./gradlew :application:generateApiClient`
 *
 * The plugin fetches the live spec from the running app and generates TypeScript
 * services + types into frontend/libs/api-client/generated/. Apps consume them
 * via their existing @pindraft/api-client import path.
 *
 * Alternative for CI: serialize the spec to a file first, then point inputSpec at
 * the file path. Useful when CI wants the generation step to be hermetic.
 */
openApiGenerate {
    generatorName.set("typescript-angular")
    inputSpec.set("http://localhost:8080/v3/api-docs")
    outputDir.set("$rootDir/../frontend/libs/api-client/generated")
    apiPackage.set("co.pindraft.api")
    modelPackage.set("co.pindraft.model")
    configOptions.set(mapOf(
        "ngVersion"            to "21.0.0",
        "providedIn"           to "root",
        "withInterfaces"       to "true",
        "useSingleRequestParameter" to "true",
        "stringEnums"          to "true",
        "fileNaming"           to "kebab-case"
    ))
}

// Convenience task name aligned with the workflow described above
tasks.register("generateApiClient") {
    dependsOn("openApiGenerate")
    group = "openapi"
    description = "Fetch the live OpenAPI spec and regenerate the TypeScript client"
}
