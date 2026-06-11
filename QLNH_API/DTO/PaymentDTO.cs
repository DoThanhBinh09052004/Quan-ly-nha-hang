namespace QLNH_API.DTO
{
    public class PaymentDTO
    {
        public long Id { get; set; }
        public int OrderId { get; set; }
        public string Provider { get; set; }
        public decimal Amount { get; set; }
        public string Status { get; set; }
        public string BankCode { get; set; }
        public string AccountNo { get; set; }
        public string? AccountName { get; set; }
        public string AddInfo { get; set; }
        public string QrText { get; set; }
        public string? TransactionId { get; set; }
        public string? ReferenceCode { get; set; }
        public DateTime? ConfirmedAt { get; set; }
        public DateTime? ExpiresAt { get; set; }
        public DateTime Created { get; set; }
        public DateTime Updated { get; set; }
    }
}
