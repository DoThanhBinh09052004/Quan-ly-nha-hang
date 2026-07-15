using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace QLNH_API.Model
{
    public class Reservation
    {
        [Key]
        public int Id { get; set; }
        public int GuestTableId { get; set; }
        public int? GuestId { get; set; }
        public string GuestName { get; set; } = string.Empty;
        public string Phone { get; set; } = string.Empty;
        public int PartySize { get; set; } = 1;
        public DateTime ReservationTime { get; set; }
        public int DurationMinutes { get; set; } = 120;
        public string Status { get; set; } = ReservationStatuses.Pending;
        public string? Note { get; set; }
        public DateTime Created { get; set; } = DateTime.Now;
        public DateTime Updated { get; set; } = DateTime.Now;
        public bool Deleted { get; set; }

        [ForeignKey(nameof(GuestTableId))]
        public virtual GuestTable? GuestTable { get; set; }

        [ForeignKey(nameof(GuestId))]
        public virtual Guest? Guest { get; set; }
    }

    public static class ReservationStatuses
    {
        public const string Pending = "RESERVATION_PENDING";
        public const string Confirmed = "RESERVATION_CONFIRMED";
        public const string Arrived = "RESERVATION_ARRIVED";
        public const string Completed = "RESERVATION_COMPLETED";
        public const string Cancelled = "RESERVATION_CANCELLED";
        public const string NoShow = "RESERVATION_NO_SHOW";
    }

}
