package co.pindraft.marketplace.application;

import co.pindraft.common.error.PindraftException;
import java.util.UUID;

public class ListingNotFoundException extends PindraftException {
    public ListingNotFoundException(UUID id) {
        super("listing_not_found", "Listing " + id + " not found", 404);
    }
}
