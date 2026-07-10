namespace QLNH_API.DTO
{
    public class GrossProfitMarginReportItemDTO
    {
        public int Year { get; set; }
        public int? Month { get; set; }
        public int? Day { get; set; }
        public decimal TotalRevenue { get; set; }
        public decimal TotalCost { get; set; }
        public decimal GrossProfit { get; set; }
        public decimal ProfitMargin { get; set; }
    }

    public class GrossProfitMarginReportDTO
    {
        public List<GrossProfitMarginReportItemDTO> Daily { get; set; } = new();
        public List<GrossProfitMarginReportItemDTO> Monthly { get; set; } = new();
        public List<GrossProfitMarginReportItemDTO> Yearly { get; set; } = new();
    }
}
