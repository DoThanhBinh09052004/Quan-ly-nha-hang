using Microsoft.EntityFrameworkCore;
using QLNH_API.Data;
using System;



namespace QLNH_API.Services
{
    public class RevenueService
    {
        private readonly ApplicationDbcontext _context;

        public RevenueService(ApplicationDbcontext context)
        {
            _context = context;
        }

        public async Task<object> GetRevenueByMonth()
        {
            var revenueByMonth = await _context.Order
                .Where(o => !o.Deleted && !o.Voided)
                .GroupBy(o => new { o.Created.Year, o.Created.Month })
                .Select(g => new
                {
                    Year = g.Key.Year,
                    Month = g.Key.Month,
                    TotalRevenue = g.Sum(x => x.TotalPrice)
                })
                .OrderBy(x => x.Year)
                .ThenBy(x => x.Month)
                .ToListAsync();

            return revenueByMonth;
        }
        public async Task<object> GetRevenueByDay()
        {
            var revenueByDay = await _context.Order
                .Where(o => !o.Deleted && !o.Voided)
                .GroupBy(o => new { o.Created.Year, o.Created.Month, o.Created.Day})
                .Select(g => new
                {
                    Year = g.Key.Year,
                    Month = g.Key.Month,
                    Day=g.Key.Day,
                    TotalRevenue = g.Sum(x => x.TotalPrice)
                })
                .OrderBy(x => x.Year)
                .ThenBy(x => x.Month)
                .ToListAsync();

            return revenueByDay;
        }
    }
}
