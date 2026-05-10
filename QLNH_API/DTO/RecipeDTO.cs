namespace QLNH_API.DTO
{
    public class RecipeDTO
    {
        public int Id { get; set; }
        public int ItemId { get; set; }
        public string? ItemName { get; set; }
        public int IngredientId { get; set; }
        public string? IngredientName { get; set; }
        public double QuantityNeeded { get; set; }
        public DateTime Created { get; set; }
        public DateTime Updated { get; set; }
    }
}
