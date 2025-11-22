using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace QLNH_API.Model
{
    public class Restaurant
    {
        [Key]
        public int Id { get; set; }
        public string Name { get; set; }
        public string Phone { get; set; }
        public string Address { get; set; }
        public string? Description { get; set; }
        public DateTime Created { get; set; } = DateTime.Now;
        public DateTime Updated { get; set; } = DateTime.Now;
        public bool Deleted { get; set; } = false;
        public int? CreatedUserId { get; set; } = 1;
        public int? UpdatedUserId { get; set; } = 1;

        [ForeignKey("CreatedUserId")]
        public virtual User? CreatedUser { get; set; }

        [ForeignKey("UpdatedUserId")]
        public virtual User? UpdatedUser { get; set; }

        public virtual ICollection<User>? Users { get; set; }

    }
}
