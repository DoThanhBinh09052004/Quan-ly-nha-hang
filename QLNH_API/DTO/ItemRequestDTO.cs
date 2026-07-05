namespace QLNH_API.DTO
{
    public class ItemRequestDTO
    {
        public int? Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string? Description { get; set; }
        public double Price { get; set; }
        public double Discount { get; set; } = 0;
        public decimal Profit { get; set; } = 0;
        public int Quantity { get; set; } = 0;
        public int? UnitId { get; set; }
        public int? CategoryId { get; set; }
        public List<int> ImageIds { get; set; } = new();
    }
}
