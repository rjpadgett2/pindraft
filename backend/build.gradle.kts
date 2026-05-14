// Root build configuration for the Pindraft backend.
// Common configuration for every subproject lives here.

plugins {
    java
    id("org.springframework.boot") version "4.0.5" apply false
    id("io.spring.dependency-management") version "1.1.7" apply false
}

allprojects {
    group = "co.pindraft"
    version = "0.1.0-SNAPSHOT"

    repositories {
        mavenCentral()
    }
}

subprojects {
    apply(plugin = "java-library")
    apply(plugin = "io.spring.dependency-management")

    java {
        toolchain {
            languageVersion = JavaLanguageVersion.of(21)
        }
    }

    the<io.spring.gradle.dependencymanagement.dsl.DependencyManagementExtension>().apply {
        imports {
            mavenBom("org.springframework.boot:spring-boot-dependencies:4.0.5")
            mavenBom("org.springframework.modulith:spring-modulith-bom:1.4.0")
        }
    }

    dependencies {
        "testImplementation"("org.springframework.boot:spring-boot-starter-test")
        "testImplementation"("org.springframework.modulith:spring-modulith-starter-test")
        // Gradle 9 + JUnit 5 requires an explicit launcher on the runtime classpath;
        // pre-9 Gradle bundled it implicitly. Without this, every test task fails
        // with "Failed to load JUnit Platform" before any test even runs.
        "testRuntimeOnly"("org.junit.platform:junit-platform-launcher")
    }

    tasks.withType<JavaCompile>().configureEach {
        options.compilerArgs.addAll(listOf("-parameters", "-Xlint:all"))
    }

    tasks.withType<Test>().configureEach {
        useJUnitPlatform()
    }
}
