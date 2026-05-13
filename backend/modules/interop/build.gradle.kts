dependencies {
    api(project(":modules:common"))

    implementation(project(":modules:identity"))
    implementation(project(":modules:mill-ops"))
    implementation(project(":modules:pools"))
    implementation(project(":modules:marketplace"))
    implementation("org.springframework.boot:spring-boot-starter-data-jpa")
    implementation("org.springframework.boot:spring-boot-starter-web")
    implementation("org.springframework.boot:spring-boot-starter-security")
    implementation("org.springframework.boot:spring-boot-starter-validation")
    implementation("org.springframework.modulith:spring-modulith-events-api")
    runtimeOnly("org.postgresql:postgresql")

    testImplementation("org.mockito:mockito-junit-jupiter")
    testImplementation("org.assertj:assertj-core")
}
