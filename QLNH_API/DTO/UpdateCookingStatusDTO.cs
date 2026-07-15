namespace QLNH_API.DTO
{
    public class UpdateCookingStatusDTO
    {
        public int OrderItemId { get; set; }
        public int CookingStatusId { get; set; }
        public string? CookingStatusCode { get; set; }
        public string? KitchenNote { get; set; }
    }

    public class OrderItemStatusDTO
    {
        public int Id { get; set; }
        public string Name { get; set; }
        public int Quantity { get; set; }
        public int CookingStatusId { get; set; }
        public string? CookingStatusCode { get; set; }
        public DateTime? CompletedAt { get; set; }
        public string? KitchenNote { get; set; }
        public int OrderId { get; set; }
        public string? OrderNumber { get; set; }
        public int? GuestTableId { get; set; }
        public string? TableName { get; set; }
        public string? GuestPhone { get; set; }
    }
}
