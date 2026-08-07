using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace QLNH_API.Model
{
    public class IngredientBatch
    {
        [Key]
        public int Id { get; set; }
        public int IngredientId { get; set; }

        [MaxLength(50)]
        public string BatchCode { get; set; } = "";

        public DateTime ReceivedDate { get; set; }
        public DateTime ExpirationDate { get; set; }
        public decimal UnitCost { get; set; }
        public double ReceivedQuantity { get; set; }
        public double RemainingQuantity { get; set; }
        public DateTime Created { get; set; } = DateTime.Now;
        public DateTime Updated { get; set; } = DateTime.Now;
        public bool Deleted { get; set; }

        [ForeignKey(nameof(IngredientId))]
        public virtual Ingredient? Ingredient { get; set; }

        public virtual ICollection<OrderItemIngredientAllocation> Allocations { get; set; } = new List<OrderItemIngredientAllocation>();
    }
}
