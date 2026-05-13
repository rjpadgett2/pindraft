package co.pindraft;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class PindraftApplication {
    public static void main(String[] args) {
        SpringApplication.run(PindraftApplication.class, args);
    }
}
