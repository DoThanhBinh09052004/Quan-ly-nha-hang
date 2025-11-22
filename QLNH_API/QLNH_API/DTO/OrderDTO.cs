using QLNH_API.Model;
using System.ComponentModel.DataAnnotations.Schema;

namespace QLNH_API.DTO
{
    public class OrderDTO
    {
        public int Id { get; set; }
        public string OrderNumber { get; set; }
        public string? Description { get; set; }
        public DateTime Created { get; set; } = DateTime.Now;
        public DateTime Updated { get; set; } = DateTime.Now;
        //public bool Deleted { get; set; } = false;
        //public bool Voided { get; set; } = false;
        public double TotalPrice { get; set; } 
        public double PaidAmount { get; set; }
        public double ChangeAmount { get; set; }


        public IEnumerable<OrderItem>?OrderItems { get; set; }


        public UserSimpleDTO? CreatedUser { get; set; }

        
        public UserSimpleDTO? UpdatedUser { get; set; }

        public  GuestTable? GuestTable { get; set; }

        public  Status? Status { get; set; }


    }
}
