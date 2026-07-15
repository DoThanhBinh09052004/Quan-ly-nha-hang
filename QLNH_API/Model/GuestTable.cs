using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace QLNH_API.Model
{
    public class GuestTable
    {
        [Key]
        public int Id { get; set; }
        public string Name { get; set; }
        public string? Description { get; set; }
        public DateTime Created { get; set; } = DateTime.Now;
        public DateTime Updated { get; set; } = DateTime.Now;
        public bool Deleted { get; set; } = false;
        public int Capacity { get; set; } = 4;
        public int Floor { get; set; } = 1;
        public int? StatusId { get; set; }

        [ForeignKey("StatusId")]
        public virtual Status? Status { get; set; }
        public int? GuestId { get; set; }

        [ForeignKey("GuestId")]
        public virtual Guest? Guest { get; set; }

        public virtual ICollection<Order>? Orders { get; set; } = new List<Order>();
        public virtual ICollection<Reservation>? Reservations { get; set; } = new List<Reservation>();
    }
}
