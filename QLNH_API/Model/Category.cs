using System.ComponentModel.DataAnnotations;

namespace QLNH_API.Model
{
    public class Category
    {
        [Key]
        public int Id { get; set; }
        public int? parentId { get; set; }
        public string Name { get; set; }
        public string? Description { get; set; }
        public DateTime Created { get; set; } = DateTime.Now;
        public DateTime Updated { get; set; } = DateTime.Now;
        public bool Deleted { get; set; } = false;
    }
}
