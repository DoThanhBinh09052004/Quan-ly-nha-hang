using QLNH_API.Model;

namespace QLNH_API.DTO
{
    public class ItemDTO
    {
        public int Id { get; set; }
        public string Name { get; set; }
        public string? Description { get; set; }
        public double Price { get; set; }
        public double Discount { get; set; }
        public int Quantity { get; set; }
        public DateTime Created { get; set; }
        public DateTime Updated { get; set; }
        //public bool Deleted { get; set; } 

        public double CostPrice { get; set; }
        public int PreparationTime { get; set; }
        public bool IsAvailable { get; set; }
        public double AverageRating { get; set; }
        public decimal Profit { get; set; }
        public UnitDTO? Unit { get; set; }
        public CategoryDTO? Category { get; set; }

        public IEnumerable<ItemImageDTO>? ItemImages { get; set; }
    }
}
