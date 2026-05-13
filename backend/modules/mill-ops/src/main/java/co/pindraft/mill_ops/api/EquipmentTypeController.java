package co.pindraft.mill_ops.api;

import co.pindraft.mill_ops.infrastructure.EquipmentTypeRepository;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/equipment-types")
@Tag(name = "Reference", description = "Platform-shared reference data")
public class EquipmentTypeController {

    private final EquipmentTypeRepository repo;

    public EquipmentTypeController(EquipmentTypeRepository repo) {
        this.repo = repo;
    }

    @GetMapping
    @Operation(summary = "List all platform-shared equipment types")
    public List<EquipmentTypeResponse> list() {
        return repo.findAll().stream()
            .map(t -> new EquipmentTypeResponse(t.getCode(), t.getName(), t.getDescription(), t.getStageCode()))
            .toList();
    }

    public record EquipmentTypeResponse(
        String code, String name, String description, String stageCode) {}
}
