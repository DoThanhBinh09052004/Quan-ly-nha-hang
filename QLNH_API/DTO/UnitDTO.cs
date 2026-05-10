using QLNH_API.Model;
using System.ComponentModel.DataAnnotations.Schema;

namespace QLNH_API.DTO
{
    public class UnitDTO
    {
        public int Id { get; set; }
        public string Name { get; set; }
        public string? Description { get; set; }
        public DateTime Created { get; set; }
        public DateTime Updated { get; set; }
        //public bool Deleted { get; set; } 

    }
}
