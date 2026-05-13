dependencies {
    api(project(":modules:common"))

    implementation(project(":modules:identity"))
    implementation(project(":modules:billing"))
    implementation(project(":modules:traceability"))
    implementation(project(":modules:pools"))
    implementation("org.springframework.boot:spring-boot-starter-data-jpa")
    implementation("org.springframework.boot:spring-boot-starter-web")
    implementation("org.springframework.boot:spring-boot-starter-validation")
    // Spring Modulith — InvoicingService uses @ApplicationModuleListener so invoice
    // generation runs in its own transaction after a LotCompletedEvent commits,
    // matching the pattern interop's WebhookDispatcher uses.
    implementation("org.springframework.modulith:spring-modulith-events-api")
    runtimeOnly("org.postgresql:postgresql")
}
