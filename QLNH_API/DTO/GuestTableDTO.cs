using QLNH_API.Model;

namespace QLNH_API.DTO
{
    public class GuestTableDTO
    {
        public int Id { get; set; }
        public string Name { get; set; }
        public string? Description { get; set; }
        public DateTime Created { get; set; }
        public DateTime Updated { get; set; }
        public bool Deleted { get; set; }
        public int Capacity { get; set; }
        public int Floor { get; set; }
        public int? StatusId { get; set; }
        public virtual StatusDTO? Status { get; set; }
        public virtual GuestDTO? Guest { get; set; }
        public decimal CurrentOrderTotal { get; set; }
        public string? CurrentGuestName { get; set; }
    }
}
