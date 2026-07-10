using System.ComponentModel.DataAnnotations;

namespace QLNH_API.Model
{
    public class ExpenseCategory
    {
        [Key]
        public int Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string? Description { get; set; }
        public DateTime Created { get; set; } = DateTime.Now;
        public DateTime Updated { get; set; } = DateTime.Now;
        public bool Deleted { get; set; } = false;

        public virtual ICollection<Expense>? Expenses { get; set; } = new List<Expense>();
    }
}
