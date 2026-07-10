namespace QLNH_API.DTO
{
    public class ExpenseRequestDTO
    {
        public int? Id { get; set; }
        public string Title { get; set; } = string.Empty;
        public string? Note { get; set; }
        public decimal Amount { get; set; }
        public DateTime ExpenseDate { get; set; } = DateTime.Now;
        public int ExpenseCategoryId { get; set; }
    }
}
