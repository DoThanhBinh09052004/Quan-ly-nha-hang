namespace QLNH_API.DTO
{
    public class OrderListItemDTO
    {
        public int Id { get; set; }
        public string OrderNumber { get; set; } = string.Empty;
        public DateTime Created { get; set; }
        public DateTime Updated { get; set; }
        public decimal TotalPrice { get; set; }
        public decimal Discount { get; set; }
        public decimal FinalPrice { get; set; }
        public decimal PaidAmount { get; set; }
        public decimal ChangeAmount { get; set; }
        public string? GuestPhone { get; set; }
        public int? GuestTableId { get; set; }
        public SimpleLookupDTO? GuestTable { get; set; }
        public SimpleLookupDTO? Status { get; set; }
    }

    public class OrderListResponseDTO
    {
        public IEnumerable<OrderListItemDTO> Items { get; set; } = new List<OrderListItemDTO>();
        public int TotalRecords { get; set; }
        public decimal TodayRevenue { get; set; }
    }

    public class SimpleLookupDTO
    {
        public int Id { get; set; }
        public string Name { get; set; } = string.Empty;
    }
}
