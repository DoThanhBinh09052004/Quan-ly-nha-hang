using Microsoft.EntityFrameworkCore;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace QLNH_API.Model
{
    [Index(nameof(Username), IsUnique = true)]
    public class User
    {
        [Key]
        public int Id { get; set; }
        public String Username { get; set; }
        public String? FullName { get; set; }
        public String? Password { get; set; } = "123456";
        public DateTime Created { get; set; } = DateTime.Now;
        public DateTime Updated { get; set; } = DateTime.Now;
        public bool Deleted { get; set; } = false;
        public bool OffDuty { get; set; } = false;
        public int? CreatedUserId { get; set; }
        public int? UpdatedUserId { get; set; } 

        [ForeignKey("CreatedUserId")]
        public virtual User? CreatedUser { get; set; }

        [ForeignKey("UpdatedUserId")]
        public virtual User? UpdatedUser { get; set; }
        public int? RoleId { get; set; }

        [ForeignKey("RoleId")]
        public  Role? role { get; set; }

        public int? RestaurantId { get; set; }

        [ForeignKey("RestaurantId")]
        public Restaurant? restaurant { get; set; }
    }
}
