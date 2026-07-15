using System;
using System.Collections.Generic;

namespace QLNH_API.DTO
{
    public class PayrollReportDTO
    {
        public string PeriodType { get; set; } = string.Empty;
        public DateTime TargetDate { get; set; }
        public DateTime FromDate { get; set; }
        public DateTime ToDate { get; set; }
        public int TotalEmployees { get; set; }
        public int TotalWorkShifts { get; set; }
        public decimal TotalGrossSalary { get; set; }
        public decimal TotalDeduction { get; set; }
        public decimal TotalNetSalary { get; set; }
        public List<PayrollEmployeeDTO> Employees { get; set; } = new();
    }

    public class PayrollEmployeeDTO
    {
        public int UserId { get; set; }
        public string Username { get; set; } = string.Empty;
        public string? FullName { get; set; }
        public decimal ShiftSalary { get; set; }
        public int WorkShiftCount { get; set; }
        public decimal GrossSalary { get; set; }
        public decimal DeductionAmount { get; set; }
        public decimal NetSalary { get; set; }
        public List<PayrollWorkShiftDetailDTO> WorkShifts { get; set; } = new();
    }

    public class PayrollWorkShiftDetailDTO
    {
        public int WorkShiftId { get; set; }
        public DateTime WorkDate { get; set; }
        public int ShiftId { get; set; }
        public string ShiftName { get; set; } = string.Empty;
        public TimeSpan StartTime { get; set; }
        public TimeSpan EndTime { get; set; }
        public decimal ShiftHours { get; set; }
        public string? Note { get; set; }
        public decimal DeductionAmount { get; set; }
    }
}
