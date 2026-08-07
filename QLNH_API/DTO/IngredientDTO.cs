namespace QLNH_API.DTO
{
    public class IngredientDTO
    {
        public int Id { get; set; }
        public string Name { get; set; } = "";
        public string Unit { get; set; } = "";
        public double StockQuantity { get; set; }
        public double MinStock { get; set; }
        public int BatchCount { get; set; }
        public int ExpiringSoonBatchCount { get; set; }
        public DateTime? EarliestExpirationDate { get; set; }
        public DateTime Created { get; set; }
        public DateTime Updated { get; set; }
    }

    public class CreateIngredientDTO
    {
        public string Name { get; set; } = "";
        public string Unit { get; set; } = "";
        public double MinStock { get; set; }
    }

    public class UpdateIngredientDTO : CreateIngredientDTO
    {
        public int Id { get; set; }
    }

    public class IngredientBatchDTO
    {
        public int Id { get; set; }
        public int IngredientId { get; set; }
        public string BatchCode { get; set; } = "";
        public DateTime ReceivedDate { get; set; }
        public DateTime ExpirationDate { get; set; }
        public decimal UnitCost { get; set; }
        public double ReceivedQuantity { get; set; }
        public double RemainingQuantity { get; set; }
        public bool IsExpired { get; set; }
        public bool IsExpiringSoon { get; set; }
        public DateTime Created { get; set; }
        public DateTime Updated { get; set; }
    }

    public class CreateIngredientBatchDTO
    {
        public string? BatchCode { get; set; }
        public DateTime ReceivedDate { get; set; }
        public DateTime ExpirationDate { get; set; }
        public decimal UnitCost { get; set; }
        public double Quantity { get; set; }
    }

    public class UpdateIngredientBatchDTO
    {
        public int Id { get; set; }
        public string? BatchCode { get; set; }
        public DateTime ReceivedDate { get; set; }
        public DateTime ExpirationDate { get; set; }
        public decimal UnitCost { get; set; }
        public double ReceivedQuantity { get; set; }
    }
}
