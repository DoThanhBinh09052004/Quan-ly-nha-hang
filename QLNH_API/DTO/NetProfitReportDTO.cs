namespace QLNH_API.DTO
{
    public class NetProfitReportItemDTO
    {
        public int Year { get; set; }
        public int? Month { get; set; }
        public int? Day { get; set; }
        public decimal TotalRevenue { get; set; }
        public decimal IngredientCost { get; set; }
        public decimal OperatingExpense { get; set; }
        public decimal NetProfit { get; set; }
        public decimal NetProfitMargin { get; set; }
    }

    public class NetProfitReportDTO
    {
        public List<NetProfitReportItemDTO> Daily { get; set; } = new();
        public List<NetProfitReportItemDTO> Monthly { get; set; } = new();
        public List<NetProfitReportItemDTO> Yearly { get; set; } = new();
    }
}
