package co.pindraft.mill_ops.api;

import co.pindraft.mill_ops.infrastructure.ProcessingStageTypeRepository;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.Comparator;
import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/processing-stage-types")
@Tag(name = "Reference", description = "Platform-shared reference data")
public class ProcessingStageTypeController {

    private final ProcessingStageTypeRepository repo;

    public ProcessingStageTypeController(ProcessingStageTypeRepository repo) {
        this.repo = repo;
    }

    @GetMapping
    @Operation(summary = "List all platform-shared processing stage types")
    public List<ProcessingStageTypeResponse> list() {
        return repo.findAll().stream()
            .sorted(Comparator.comparingInt(t -> t.getTypicalOrder()))
            .map(t -> new ProcessingStageTypeResponse(
                t.getCode(), t.getName(), t.getDescription(), t.getTypicalOrder()))
            .toList();
    }

    public record ProcessingStageTypeResponse(
        String code, String name, String description, int typicalOrder) {}
}
