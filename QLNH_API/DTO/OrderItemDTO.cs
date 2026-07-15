using QLNH_API.Model;
using System.ComponentModel.DataAnnotations.Schema;

namespace QLNH_API.DTO
{
    public class OrderItemDTO
    {
        public int Id { get; set; }
        public string Name { get; set; }
        public string? Description { get; set; }
        public DateTime Created { get; set; }
        public DateTime Updated { get; set; }
        //public bool Deleted { get; set; }
        //public bool Volded { get; set; } 
        public double SalePrice { get; set; }

        public int Quantity { get; set; }
        public int? ItemId { get; set; }
        public int OrderId { get; set; }
        public int? CookingStatusId { get; set; }
        public string? CookingStatusCode { get; set; }
        public string? CookingStatusName { get; set; }
        public DateTime? CompletedAt { get; set; }
        public string? KitchenNote { get; set; }



        public ItemDTO? Item { get; set; }

    }
}
