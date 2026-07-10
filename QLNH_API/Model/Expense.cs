using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace QLNH_API.Model
{
    public class Expense
    {
        [Key]
        public int Id { get; set; }
        public string Title { get; set; } = string.Empty;
        public string? Note { get; set; }
        public decimal Amount { get; set; } = 0;
        public DateTime ExpenseDate { get; set; } = DateTime.Now;
        public DateTime Created { get; set; } = DateTime.Now;
        public DateTime Updated { get; set; } = DateTime.Now;
        public bool Deleted { get; set; } = false;

        public int ExpenseCategoryId { get; set; }

        [ForeignKey("ExpenseCategoryId")]
        public virtual ExpenseCategory? ExpenseCategory { get; set; }
    }
}
