using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace QLNH_API.Model
{
    public class Item
    {
        [Key]
        public int Id { get; set; }
        public string Name { get; set; }
        public string? Description { get; set; }
        public double Price { get; set; } = 0;
        public double Discount { get; set; } = 0;
        public int Quantity { get; set; } = 0;
        public DateTime Created { get; set; } = DateTime.Now;
        public DateTime Updated { get; set; } = DateTime.Now;
        public bool Deleted { get; set; } = false;
        public double CostPrice { get; set; } = 0;
        public int PreparationTime { get; set; } = 15;
        public bool IsAvailable { get; set; } = true;
        public double AverageRating { get; set; } = 0;

        public int? UnitId { get; set; }

        [ForeignKey("UnitId")]
        public virtual Unit? Unit { get; set; }
       
        public int? CategoryId { get; set; }

        [ForeignKey("CategoryId")]
        public virtual Category? Category { get; set; }
        public virtual ICollection<ItemImage>? ItemImages { get; set; }
    }
}
