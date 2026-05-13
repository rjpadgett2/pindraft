dependencies {
    api("org.springframework.boot:spring-boot-starter")
    api("org.springframework.boot:spring-boot-starter-web")
    api("org.springframework.boot:spring-boot-starter-validation")
    api("org.springframework.modulith:spring-modulith-starter-core")

    // JSpecify annotations for null-safety
    api("org.jspecify:jspecify:1.0.0")

    // Swagger / OpenAPI annotations (@Tag, @Operation, etc.) used by controllers
    // in every module. The springdoc runtime that consumes them lives in :application.
    api("io.swagger.core.v3:swagger-annotations:2.2.30")
}
