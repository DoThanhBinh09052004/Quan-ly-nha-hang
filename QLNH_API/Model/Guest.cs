using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

namespace QLNH_API.Model
{
    public class Guest
    {
        [Key]
        public int Id { get; set; }
        public string Name { get; set; }
        public string Phone { get; set; }
        public string? Description { get; set; }
        public DateTime Created { get; set; } = DateTime.Now;
        public DateTime Updated { get; set; } = DateTime.Now;
        public bool Deleted { get; set; } = false;
        public int Points { get; set; } = 0;
        [JsonIgnore]
        public virtual ICollection<Order>? Orders { get; set; } = new List<Order>();
    }
}