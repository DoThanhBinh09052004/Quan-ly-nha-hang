using QLNH_API.Model;

namespace QLNH_API.DTO
{
    public class RoleDTO
    {
        public int Id { get; set; }
        public string Name { get; set; }
        public string Description { get; set; }
        public DateTime Created { get; set; }
        public DateTime Updated { get; set; }
        public bool Deleted { get; set; }
        public UserSimpleDTO? CreatedUser { get; set; }
        public UserSimpleDTO? UpdatedUser { get; set; }
        public IEnumerable<UserSimpleDTO>? Users { get; set; }
    }
}

