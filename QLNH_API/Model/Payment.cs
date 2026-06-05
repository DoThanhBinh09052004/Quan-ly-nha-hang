using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace QLNH_API.Model
{
    public class Payment
    {
        [Key]
        public long Id { get; set; }
        
        public int OrderId { get; set; }
        
        [Required]
        [MaxLength(30)]
        public string Provider { get; set; }
        
        public double Amount { get; set; }
        
        [Required]
        [MaxLength(20)]
        public string Status { get; set; }
        
        [Required]
        [MaxLength(20)]
        public string BankCode { get; set; }
        
        [Required]
        [MaxLength(50)]
        public string AccountNo { get; set; }
        
        [MaxLength(255)]
        public string? AccountName { get; set; }
        
        [Required]
        [MaxLength(50)]
        public string AddInfo { get; set; }
        
        [Required]
        public string QrText { get; set; }
        
        public DateTime Created { get; set; } = DateTime.Now;
        public DateTime Updated { get; set; } = DateTime.Now;

        [ForeignKey("OrderId")]
        public virtual Order? Order { get; set; }
    }
}
