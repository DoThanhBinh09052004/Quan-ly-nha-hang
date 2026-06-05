using QLNH_API.Model;
using System.Collections.Generic;

namespace QLNH_API.DTO
{
    public class UserDTO
    {
        public int Id { get; set; }
        public String Username { get; set; }
        public String Password { get; set; }
        public String? FullName { get; set; }
        public DateTime Created { get; set; } 
        public DateTime Updated { get; set; }
        //public bool Deleted { get; set; }
        //public bool OffDuty { get; set; }
        public UserSimpleDTO? CreatedUser { get; set; }
        public UserSimpleDTO? UpdatedUser { get; set; }
        public  RoleSimpleDTO? role { get; set; }
        public RestaurantSimpleDTO? restaurant { get; set; }

    }
}
