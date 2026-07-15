namespace QLNH_API.DTO.Reservation
{
    public class ReservationDTO
    {
        public int Id { get; set; }
        public int GuestTableId { get; set; }
        public string? GuestTableName { get; set; }
        public int? GuestId { get; set; }
        public string GuestName { get; set; } = string.Empty;
        public string Phone { get; set; } = string.Empty;
        public int PartySize { get; set; }
        public DateTime ReservationTime { get; set; }
        public int DurationMinutes { get; set; }
        public DateTime ReservationEndTime { get; set; }
        public string Status { get; set; } = string.Empty;
        public string? Note { get; set; }
        public DateTime Created { get; set; }
        public DateTime Updated { get; set; }
    }
}
