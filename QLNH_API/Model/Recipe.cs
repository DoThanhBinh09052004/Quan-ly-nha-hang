using System.ComponentModel.DataAnnotations.Schema;
using System.ComponentModel.DataAnnotations;

namespace QLNH_API.Model
{
    public class Recipe
    {
        [Key]
        public int Id { get; set; }
        public int ItemId { get; set; }
        public int IngredientId { get; set; }
        public double QuantityNeeded { get; set; }
        public DateTime Created { get; set; } = DateTime.Now;
        public DateTime Updated { get; set; } = DateTime.Now;

        [ForeignKey("ItemId")]
        public virtual Item? Item { get; set; }

        [ForeignKey("IngredientId")]
        public virtual Ingredient? Ingredient { get; set; }
    }
}
