using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using QLNH_API.Data;
using QLNH_API.DTO;
using System;
using System.Linq;
using System.Threading.Tasks;

namespace QLNH_API.Controllers
{
    [ApiController]
    [Route("payroll")]
    [Authorize(Roles = "Manager")]
    public class PayrollController : ControllerBase
    {
        private readonly ApplicationDbcontext _context;

        public PayrollController(ApplicationDbcontext context)
        {
            _context = context;
        }

        [HttpGet("weekly")]
        public async Task<ActionResult<PayrollReportDTO>> GetWeeklyReport([FromQuery] DateTime? date)
        {
            if (!date.HasValue)
            {
                return BadRequest("Ngay la bat buoc.");
            }

            var targetDate = date.Value.Date;
            var fromDate = GetWeekStart(targetDate);
            var toDate = fromDate.AddDays(6);

            var report = await BuildReportAsync("weekly", targetDate, fromDate, toDate);
            return Ok(report);
        }

        [HttpGet("monthly")]
        public async Task<ActionResult<PayrollReportDTO>> GetMonthlyReport([FromQuery] DateTime? date)
        {
            if (!date.HasValue)
            {
                return BadRequest("Ngay la bat buoc.");
            }

            var targetDate = date.Value.Date;
            var fromDate = new DateTime(targetDate.Year, targetDate.Month, 1);
            var toDate = fromDate.AddMonths(1).AddDays(-1);

            var report = await BuildReportAsync("monthly", targetDate, fromDate, toDate);
            return Ok(report);
        }

        private async Task<PayrollReportDTO> BuildReportAsync(string periodType, DateTime targetDate, DateTime fromDate, DateTime toDate)
        {
            var workShifts = await _context.WorkShift
                .AsNoTracking()
                .Include(ws => ws.User)
                .Include(ws => ws.Shift)
                .Where(ws =>
                    !ws.Deleted &&
                    ws.User != null &&
                    !ws.User.Deleted &&
                    ws.Shift != null &&
                    !ws.Shift.Deleted &&
                    ws.WorkDate >= fromDate &&
                    ws.WorkDate <= toDate.AddDays(1).AddTicks(-1))
                .OrderBy(ws => ws.WorkDate)
                .ThenBy(ws => ws.ShiftId)
                .ThenBy(ws => ws.UserId)
                .ToListAsync();

            var employees = workShifts
                .GroupBy(ws => ws.UserId)
                .Select(group =>
                {
                    var first = group.First();
                    var user = first.User!;
                    var shiftSalary = user.ShiftSalary;

                    var details = group
                        .OrderBy(ws => ws.WorkDate)
                        .ThenBy(ws => ws.ShiftId)
                        .Select(ws => new PayrollWorkShiftDetailDTO
                        {
                            WorkShiftId = ws.Id,
                            WorkDate = ws.WorkDate.Date,
                            ShiftId = ws.ShiftId,
                            ShiftName = ws.Shift?.Name ?? string.Empty,
                            StartTime = ws.Shift?.StartTime ?? TimeSpan.Zero,
                            EndTime = ws.Shift?.EndTime ?? TimeSpan.Zero,
                            ShiftHours = CalculateShiftHours(ws.Shift?.StartTime, ws.Shift?.EndTime),
                            Note = ws.Note,
                            DeductionAmount = ws.PenaltyAmount
                        })
                        .ToList();

                    var workShiftCount = details.Count;
                    var grossSalary = shiftSalary * workShiftCount;
                    var deductionAmount = details.Sum(x => x.DeductionAmount);

                    return new PayrollEmployeeDTO
                    {
                        UserId = user.Id,
                        Username = user.Username,
                        FullName = user.FullName,
                        ShiftSalary = shiftSalary,
                        WorkShiftCount = workShiftCount,
                        GrossSalary = grossSalary,
                        DeductionAmount = deductionAmount,
                        NetSalary = grossSalary - deductionAmount,
                        WorkShifts = details
                    };
                })
                .OrderBy(x => x.Username)
                .ToList();

            var totalWorkShifts = employees.Sum(x => x.WorkShiftCount);
            var totalGrossSalary = employees.Sum(x => x.GrossSalary);
            var totalDeduction = employees.Sum(x => x.DeductionAmount);

            return new PayrollReportDTO
            {
                PeriodType = periodType,
                TargetDate = targetDate,
                FromDate = fromDate,
                ToDate = toDate,
                TotalEmployees = employees.Count,
                TotalWorkShifts = totalWorkShifts,
                TotalGrossSalary = totalGrossSalary,
                TotalDeduction = totalDeduction,
                TotalNetSalary = totalGrossSalary - totalDeduction,
                Employees = employees
            };
        }

        private static DateTime GetWeekStart(DateTime date)
        {
            var dayOfWeek = (int)date.DayOfWeek;
            var offset = dayOfWeek == 0 ? -6 : 1 - dayOfWeek;
            return date.AddDays(offset).Date;
        }

        private static decimal CalculateShiftHours(TimeSpan? startTime, TimeSpan? endTime)
        {
            if (!startTime.HasValue || !endTime.HasValue)
            {
                return 0m;
            }

            var minutes = (endTime.Value - startTime.Value).TotalMinutes;
            if (minutes < 0)
            {
                minutes += TimeSpan.FromDays(1).TotalMinutes;
            }

            return Math.Round((decimal)minutes / 60m, 2, MidpointRounding.AwayFromZero);
        }
    }
}
