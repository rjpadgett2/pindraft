package co.pindraft.marketplace.domain;

/**
 * Listing lifecycle:
 *
 * <ul>
 *   <li>DRAFT — mill is composing; not visible publicly.</li>
 *   <li>PUBLISHED — visible in public browse and detail.</li>
 *   <li>SOLD — was published, now closed. May still appear in mill's history.</li>
 *   <li>ARCHIVED — mill removed it; not visible anywhere.</li>
 * </ul>
 */
public enum ListingStatus {
    DRAFT, PUBLISHED, SOLD, ARCHIVED
}
