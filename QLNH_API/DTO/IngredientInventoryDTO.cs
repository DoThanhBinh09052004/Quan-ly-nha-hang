namespace QLNH_API.DTO
{
    public class IngredientShortageDTO
    {
        public int IngredientId { get; set; }
        public string IngredientName { get; set; } = "";
        public string Unit { get; set; } = "";
        public double Required { get; set; }
        public double Available { get; set; }
    }

    public class IngredientInventoryErrorDTO
    {
        public string Message { get; set; } = "";
        public IReadOnlyCollection<IngredientShortageDTO> Shortages { get; set; } = Array.Empty<IngredientShortageDTO>();
    }
}
