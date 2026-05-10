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
        public virtual StatusDTO? Status { get; set; }
        public virtual GuestDTO? Guest { get; set; }
        public virtual RestaurantSimpleDTO Restaurant {get; set;}

    }
}
