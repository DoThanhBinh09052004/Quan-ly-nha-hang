using System.ComponentModel.DataAnnotations;

namespace QLNH_API.Model
{
    public class Ingredient
    {
        [Key]
        public int Id { get; set; }
        public string Name { get; set; }
        public string Unit { get; set; }
        public decimal RawMaterialCost { get; set; }
        public double StockQuantity { get; set; }
        public double MinStock { get; set; }
        public DateTime Created { get; set; } = DateTime.Now;
        public DateTime Updated { get; set; } = DateTime.Now;
        public bool Deleted { get; set; } = false;
    }
}
