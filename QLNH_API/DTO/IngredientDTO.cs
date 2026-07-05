namespace QLNH_API.DTO
{
    public class IngredientDTO
    {
        public int Id { get; set; }
        public string Name { get; set; }
        public string Unit { get; set; }
        public decimal RawMaterialCost { get; set; }
        public double StockQuantity { get; set; }
        public double MinStock { get; set; }
        public DateTime Created { get; set; }
        public DateTime Updated { get; set; }
    }
}
