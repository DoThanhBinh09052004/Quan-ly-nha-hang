using System.ComponentModel.DataAnnotations;

namespace QLNH_API.DTO.Reservation
{
    public class CreateReservationDTO
    {
        [Required]
        public int GuestTableId { get; set; }
        public int? GuestId { get; set; }
        [Required, MaxLength(150)]
        public string GuestName { get; set; } = string.Empty;
        [Required, MaxLength(30)]
        public string Phone { get; set; } = string.Empty;
        [Range(1, 50)]
        public int PartySize { get; set; } = 1;
        [Required]
        public DateTime ReservationTime { get; set; }
        [Range(15, 1440)]
        public int DurationMinutes { get; set; } = 120;
        public string? Note { get; set; }
    }
}
