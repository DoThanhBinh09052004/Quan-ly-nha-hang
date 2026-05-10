using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace QLNH_API.Model
{
    public class ItemImage
    {
        [Key]
        public int Id { get; set; }
        public string Name { get; set; }
        public string Data { get; set; }
        public string? Description { get; set; }
        public DateTime Created { get; set; } = DateTime.Now;
        public DateTime Updated { get; set; } = DateTime.Now;
        public bool Deleted { get; set; } = false;

        public int? ItemId { get; set; }

        [ForeignKey("ItemId")]
        public virtual Item? Item { get; set; }
    }
}
