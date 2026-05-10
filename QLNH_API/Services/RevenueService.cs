using Microsoft.EntityFrameworkCore;
using QLNH_API.Data;

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
                .Where(o => !o.Deleted && !o.Voided && o.StatusId == 3)
                .GroupBy(o => new { o.Created.Year, o.Created.Month })
                .Select(g => new
                {
                    Year = g.Key.Year,
                    Month = g.Key.Month,
                    TotalRevenue = g.Sum(x => x.FinalPrice),
                    TotalOrders = g.Count(),
                    AverageOrderValue = g.Average(x => x.FinalPrice)
                })
                .OrderBy(x => x.Year)
                .ThenBy(x => x.Month)
                .ToListAsync();

            return revenueByMonth;
        }

        public async Task<object> GetRevenueByDay()
        {
            var revenueByDay = await _context.Order
               .Where(o => !o.Deleted && !o.Voided && o.StatusId == 3)
               .GroupBy(o => new { o.Created.Year, o.Created.Month,o.Created.Day })
               .Select(g => new
               {
                   Year = g.Key.Year,
                   Month = g.Key.Month,
                   Day=g.Key.Day,
                   TotalRevenue = g.Sum(x => x.FinalPrice),
                   TotalOrders = g.Count(),
                   AverageOrderValue = g.Average(x => x.FinalPrice)
               })
               .OrderBy(x => x.Year)
               .ThenBy(x => x.Month)
               .ThenBy(x => x.Day)
               .ToListAsync();

            return revenueByDay;
        }
        public async Task<object> GetRevenueByHour(int days = 30)
        {
            var fromDate = DateTime.Now.AddDays(-days);

            var revenueByHour = await _context.Order
                .Where(o => !o.Deleted && !o.Voided && o.StatusId == 3 && o.Created >= fromDate)
                .GroupBy(o => o.Created.Hour)
                .Select(g => new
                {
                    Hour = g.Key,
                    TotalRevenue = g.Sum(x => x.FinalPrice),
                    TotalOrders = g.Count(),
                    AverageOrderValue = g.Average(x => x.FinalPrice)
                })
                .OrderBy(x => x.Hour)
                .ToListAsync();

            return revenueByHour;
        }

        public async Task<object> GetRevenueByDayOfWeek(int days = 90)
        {
            var fromDate = DateTime.Now.AddDays(-days);

            var revenueByDayOfWeek = await _context.Order
                .Where(o => !o.Deleted && !o.Voided && o.StatusId == 3 && o.Created >= fromDate)
                .GroupBy(o => o.Created.DayOfWeek)
                .Select(g => new
                {
                    DayOfWeek = g.Key.ToString(),
                    DayOfWeekValue = (int)g.Key,
                    TotalRevenue = g.Sum(x => x.FinalPrice),
                    TotalOrders = g.Count(),
                    AverageOrderValue = g.Average(x => x.FinalPrice)
                })
                .OrderBy(x => x.DayOfWeekValue)
                .ToListAsync();

            return revenueByDayOfWeek;
        }

        public async Task<object> GetBestSellingItems(int days = 30, int top = 10)
        {
            var fromDate = DateTime.Now.AddDays(-days);

            var bestSellers = await _context.OrderItem
                .Include(oi => oi.Item)
                .Where(oi => oi.Created >= fromDate && !oi.Deleted && !oi.Voided)
                .GroupBy(oi => new { oi.ItemId, oi.Name })
                .Select(g => new
                {
                    ItemId = g.Key.ItemId,
                    ItemName = g.Key.Name,
                    TotalQuantity = g.Sum(x => x.Quantity),
                    TotalRevenue = g.Sum(x => x.SalePrice * x.Quantity),
                    OrderCount = g.Select(x => x.OrderId).Distinct().Count()
                })
                .OrderByDescending(x => x.TotalQuantity)
                .Take(top)
                .ToListAsync();

            return bestSellers;
        }

        public async Task<object> GetTableTurnoverAnalysis(int days = 30)
        {
            var fromDate = DateTime.Now.AddDays(-days);

            var orders = await _context.Order
                .Include(o => o.GuestTable)
                .Where(o => !o.Deleted && o.StatusId == 3 &&
                           o.CheckInTime != null && o.CheckOutTime != null &&
                           o.Created >= fromDate)
                .ToListAsync();

            var analysis = orders
                .Where(o => o.CheckOutTime > o.CheckInTime)
                .Select(o => new
                {
                    OrderId = o.Id,
                    TableId = o.GuestTableId,
                    TableName = o.GuestTable != null ? o.GuestTable.Name : "N/A",
                    CheckIn = o.CheckInTime,
                    CheckOut = o.CheckOutTime,
                    DurationMinutes = (o.CheckOutTime.Value - o.CheckInTime.Value).TotalMinutes,
                    PartySize = o.PartySize
                })
                .ToList();

            var summary = new
            {
                AverageTurnoverMinutes = analysis.Any() ? analysis.Average(x => x.DurationMinutes) : 0,
                MinTurnoverMinutes = analysis.Any() ? analysis.Min(x => x.DurationMinutes) : 0,
                MaxTurnoverMinutes = analysis.Any() ? analysis.Max(x => x.DurationMinutes) : 0,
                Details = analysis.OrderByDescending(x => x.DurationMinutes).Take(20)
            };

            return summary;
        }

        public async Task<object> GetRevenueByPartySize(int days = 90)
        {
            var fromDate = DateTime.Now.AddDays(-days);

            var revenueByPartySize = await _context.Order
                .Where(o => !o.Deleted && o.StatusId == 3 && o.Created >= fromDate && o.PartySize > 0)
                .GroupBy(o => o.PartySize)
                .Select(g => new
                {
                    PartySize = g.Key,
                    TotalRevenue = g.Sum(x => x.FinalPrice),
                    TotalOrders = g.Count(),
                    AverageRevenuePerOrder = g.Average(x => x.FinalPrice)
                })
                .OrderBy(x => x.PartySize)
                .ToListAsync();

            return revenueByPartySize;
        }

        public async Task<object> GetRevenueForecast(int days = 7)
        {
            var fromDate = DateTime.Now.AddDays(-30);

            var historicalData = await _context.Order
                .Where(o => !o.Deleted && o.StatusId == 3 && o.Created >= fromDate)
                .GroupBy(o => o.Created.Date)
                .Select(g => new
                {
                    Date = g.Key,
                    Revenue = g.Sum(x => x.FinalPrice)
                })
                .OrderBy(x => x.Date)
                .ToListAsync();

            // Build a mutable series (history + generated points) so each forecast day
            // can depend on previous predicted days instead of repeating one fixed value.
            var series = historicalData
                .ToDictionary(x => x.Date, x => Convert.ToDouble(x.Revenue));

            var dayOfWeekStats = historicalData
                .GroupBy(x => x.Date.DayOfWeek)
                .ToDictionary(
                    g => g.Key,
                    g => g.Select(x => Convert.ToDouble(x.Revenue)).Average()
                );

            var overallAverage = historicalData.Any()
                ? historicalData.Select(x => Convert.ToDouble(x.Revenue)).Average()
                : 0d;

            var forecast = new List<object>();
            for (int i = 0; i < days; i++)
            {
                var forecastDate = DateTime.Now.Date.AddDays(i + 1);

                var recentWindow = Enumerable.Range(1, 14)
                    .Select(offset => forecastDate.AddDays(-offset))
                    .Where(series.ContainsKey)
                    .Select(d => series[d])
                    .ToList();

                var weightedBase = 0d;
                if (recentWindow.Any())
                {
                    var totalWeight = 0d;
                    for (int idx = 0; idx < recentWindow.Count; idx++)
                    {
                        // More recent days get higher weight.
                        var weight = recentWindow.Count - idx;
                        weightedBase += recentWindow[idx] * weight;
                        totalWeight += weight;
                    }
                    weightedBase = totalWeight > 0 ? weightedBase / totalWeight : 0d;
                }
                else
                {
                    weightedBase = overallAverage;
                }

                var sameDayAverage = dayOfWeekStats.TryGetValue(forecastDate.DayOfWeek, out var avgByDow)
                    ? avgByDow
                    : overallAverage;

                // Blend recent trend with weekly seasonality so daily forecasts vary.
                var predictedRevenue = (weightedBase * 0.7) + (sameDayAverage * 0.3);

                // Keep output stable and non-negative for charting.
                predictedRevenue = Math.Max(0, predictedRevenue);
                series[forecastDate] = predictedRevenue;

                forecast.Add(new
                {
                    Date = forecastDate,
                    PredictedRevenue = Math.Round(predictedRevenue, 0),
                    Confidence = recentWindow.Count >= 10 ? "Medium" : "Low"
                });
            }

            return new
            {
                HistoricalData = historicalData.TakeLast(30),
                Forecast = forecast
            };
        }
    }
}