package co.pindraft.mill_ops.domain;

public enum ReservationStatus {
    PENDING,   // booked, fiber not yet arrived
    RECEIVED,  // fiber arrived, lot created via intake transaction
    CANCELLED  // booking cancelled before fiber arrived
}
