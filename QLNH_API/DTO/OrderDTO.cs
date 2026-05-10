namespace QLNH_API.DTO
{
    public class OrderDTO
    {
        public int Id { get; set; }
        public string OrderNumber { get; set; }
        public string? Description { get; set; }
        public DateTime Created { get; set; }
        public DateTime Updated { get; set; }
        public double TotalPrice { get; set; }
        public double Discount { get; set; }
        public double FinalPrice { get; set; }
        public double PaidAmount { get; set; }
        public double ChangeAmount { get; set; }
        public string? GuestPhone { get; set; }
        public DateTime? CheckInTime { get; set; }
        public DateTime? CheckOutTime { get; set; }
        public int PartySize { get; set; }

        public GuestDTO? Guest { get; set; }
        public GuestTableDTO? GuestTable { get; set; }
        public UserSimpleDTO? CreatedUser { get; set; }
        public UserSimpleDTO? UpdatedUser { get; set; }
        public StatusDTO? Status { get; set; }
        public IEnumerable<OrderItemDTO>? OrderItems { get; set; }
    }
}