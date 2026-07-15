using System;

namespace QLNH_API.DTO
{
    public class WorkShiftDTO
    {
        public int Id { get; set; }
        public int UserId { get; set; }
        public UserSimpleDTO? User { get; set; }
        public int ShiftId { get; set; }
        public ShiftDTO? Shift { get; set; }
        public DateTime WorkDate { get; set; }
        public string? Note { get; set; }
        public decimal PenaltyAmount { get; set; } = 0m;
    }

    public class WorkShiftRequestDTO
    {
        public int? Id { get; set; }
        public int UserId { get; set; }
        public int ShiftId { get; set; }
        public DateTime WorkDate { get; set; }
        public string? Note { get; set; }
        public decimal PenaltyAmount { get; set; } = 0m;
    }
}
