namespace QLNH_API.DTO
{
    public class OrderDTO
    {
        public int Id { get; set; }
        public string OrderNumber { get; set; }
        public string? Description { get; set; }
        public DateTime Created { get; set; }
        public DateTime Updated { get; set; }
        public decimal TotalPrice { get; set; }
        public decimal Discount { get; set; }
        public int UsedPoint { get; set; }
        public decimal FinalPrice { get; set; }
        public decimal ActualCost { get; set; }
        public decimal ActualProfit { get; set; }
        public decimal PaidAmount { get; set; }
        public decimal ChangeAmount { get; set; }
        public string? GuestPhone { get; set; }
        public DateTime? CheckInTime { get; set; }
        public DateTime? CheckOutTime { get; set; }
        public int PartySize { get; set; }
        public int? ReservationId { get; set; }

        public GuestDTO? Guest { get; set; }
        public GuestTableDTO? GuestTable { get; set; }
        public UserSimpleDTO? CreatedUser { get; set; }
        public UserSimpleDTO? UpdatedUser { get; set; }
        public StatusDTO? Status { get; set; }
        public IEnumerable<OrderItemDTO>? OrderItems { get; set; }
    }
}
