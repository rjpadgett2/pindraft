# Multi-stage build for the Pindraft Spring Boot application.
#
# Build stage uses Eclipse Temurin 21 JDK with Gradle wrapper; runtime stage
# uses the slimmer JRE image. Total image is ~250MB; would be smaller with
# jlink/native compilation if startup time becomes an issue.

FROM eclipse-temurin:21-jdk-alpine AS build
WORKDIR /workspace

# Cache layer: dependencies before source
COPY backend/gradlew backend/gradlew.bat backend/settings.gradle.kts backend/build.gradle.kts /workspace/backend/
COPY backend/gradle /workspace/backend/gradle/
RUN cd backend && ./gradlew --no-daemon dependencies || true

# Copy source and build
COPY backend /workspace/backend
RUN cd backend && ./gradlew --no-daemon :application:bootJar -x test

FROM eclipse-temurin:21-jre-alpine
WORKDIR /app

# Run as non-root
RUN addgroup -S pindraft && adduser -S pindraft -G pindraft

COPY --from=build /workspace/backend/application/build/libs/*.jar /app/pindraft.jar
RUN chown pindraft:pindraft /app/pindraft.jar
USER pindraft

ENV SPRING_PROFILES_ACTIVE=prod
ENV JAVA_OPTS="-XX:MaxRAMPercentage=75.0 -XX:+UseG1GC -XX:+ExitOnOutOfMemoryError"

EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s --start-period=60s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost:8080/actuator/health || exit 1

ENTRYPOINT ["sh", "-c", "java $JAVA_OPTS -jar /app/pindraft.jar"]
