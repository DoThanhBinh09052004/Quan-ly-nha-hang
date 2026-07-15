using System.ComponentModel.DataAnnotations;

namespace QLNH_API.DTO.Reservation
{
    public class ChangeReservationStatusDTO
    {
        [Required]
        public string Status { get; set; } = string.Empty;
    }
}
