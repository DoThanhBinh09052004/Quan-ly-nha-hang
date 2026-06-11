using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace QLNH_API.Model
{
    public class Order
    {
        [Key]
        public int Id { get; set; }
        public string OrderNumber { get; set; }
        public string? Description { get; set; }
        public DateTime Created { get; set; } = DateTime.Now;
        public DateTime Updated { get; set; } = DateTime.Now;
        public bool Deleted { get; set; } = false;
        public bool Voided { get; set; } = false;
        public decimal TotalPrice { get; set; } = 0;
        public decimal PaidAmount { get; set; } = 0;
        public decimal ChangeAmount { get; set; } = 0;

        public string? GuestPhone { get; set; }
        public int? GuestId { get; set; }
        public decimal Discount { get; set; } = 0;
        public decimal FinalPrice { get; set; } = 0;
        public DateTime? CheckInTime { get; set; }
        public DateTime? CheckOutTime { get; set; }
        public int PartySize { get; set; } = 1;

        public int? GuestTableId { get; set; }

        [ForeignKey("GuestTableId")]
        public virtual GuestTable? GuestTable { get; set; }

        [ForeignKey("GuestId")]
        public virtual Guest? Guest { get; set; }

        public int? CreatedUserId { get; set; }
        public int? UpdatedUserId { get; set; }

        public virtual ICollection<OrderItem>? OrderItems { get; set; } = new List<OrderItem>();

        [ForeignKey("CreatedUserId")]
        public virtual User? CreatedUser { get; set; }

        [ForeignKey("UpdatedUserId")]
        public virtual User? UpdatedUser { get; set; }

        public int? StatusId { get; set; } = 4;

        [ForeignKey("StatusId")]
        public virtual Status? Status { get; set; }
    }
}
