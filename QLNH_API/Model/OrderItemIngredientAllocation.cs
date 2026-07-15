using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace QLNH_API.Model
{
    public class OrderItemIngredientAllocation
    {
        [Key]
        public int Id { get; set; }
        public int OrderItemId { get; set; }
        public int IngredientId { get; set; }
        public double ReservedQuantity { get; set; }
        public double ConsumedQuantity { get; set; }
        public double ReturnedQuantity { get; set; }
        public DateTime Created { get; set; } = DateTime.Now;
        public DateTime Updated { get; set; } = DateTime.Now;

        [ForeignKey("OrderItemId")]
        public virtual OrderItem? OrderItem { get; set; }

        [ForeignKey("IngredientId")]
        public virtual Ingredient? Ingredient { get; set; }
    }
}
