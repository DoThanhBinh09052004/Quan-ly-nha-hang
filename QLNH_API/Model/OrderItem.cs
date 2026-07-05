using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Text.Json.Serialization;

namespace QLNH_API.Model
{
    public class OrderItem
    {
        [Key]
        public int Id { get; set; }
        public string Name { get; set; }
        public string? Description { get; set; }
        public DateTime Created { get; set; } = DateTime.Now;
        public DateTime Updated { get; set; } = DateTime.Now;
        public bool Deleted { get; set; } = false;
        public bool Voided { get; set; } = false;
        public double SalePrice { get; set; } = 0;
        public int Quantity { get; set; } = 1;
        public int? ItemId { get; set; }
        public int? CookingStatusId { get; set; } 
        public DateTime? CompletedAt { get; set; } 
        public string? KitchenNote { get; set; }   

        [ForeignKey("ItemId")]
        public virtual Item? Item { get; set; }

        public int OrderId { get; set; }

        [ForeignKey("OrderId")]
        [JsonIgnore]
        public virtual Order? Order { get; set; }

        [ForeignKey("CookingStatusId")]
        public virtual Status? CookingStatus { get; set; }
    }
}
