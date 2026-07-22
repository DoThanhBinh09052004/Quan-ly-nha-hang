using Microsoft.EntityFrameworkCore;
using QLNH_API.Data;
using QLNH_API.DTO;

namespace QLNH_API.Services
{
    public class RevenueService
    {
        private readonly ApplicationDbcontext _context;

        public RevenueService(ApplicationDbcontext context)
        {
            _context = context;
        }

        public async Task<object> GetRevenueByMonth(
            DateTime? fromDate = null,
            DateTime? toDate = null,
            CancellationToken cancellationToken = default)
        {
            var orders = ApplyOrderDateRange(
                _context.Order.Where(o => !o.Deleted && !o.Voided && o.StatusId == 3),
                fromDate,
                toDate);

            var revenueByMonth = await orders
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
                .ToListAsync(cancellationToken);

            return revenueByMonth;
        }

        public async Task<object> GetRevenueByDay(
            DateTime? fromDate = null,
            DateTime? toDate = null,
            CancellationToken cancellationToken = default)
        {
            var orders = ApplyOrderDateRange(
                GetRecordedRevenueOrders(),
                fromDate,
                toDate);

            var revenueByDay = await orders
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
               .ToListAsync(cancellationToken);

            return revenueByDay;
        }

        public async Task<decimal> GetTodayRevenue(CancellationToken cancellationToken = default)
        {
            var today = DateTime.Today;
            var orders = ApplyOrderDateRange(GetRecordedRevenueOrders(), today, today);

            return await orders.SumAsync(order => (decimal?)order.FinalPrice, cancellationToken) ?? 0m;
        }

        public async Task<GrossProfitMarginReportDTO> GetGrossProfitAndProfitMarginReport(
            DateTime? fromDate = null,
            DateTime? toDate = null,
            CancellationToken cancellationToken = default)
        {
            var orders = ApplyOrderDateRange(
                _context.Order.Where(o => !o.Deleted && !o.Voided && o.StatusId == 3),
                fromDate,
                toDate);

            var daily = await orders
                .GroupBy(o => new { o.Created.Year, o.Created.Month, o.Created.Day })
                .Select(g => new GrossProfitMarginReportItemDTO
                {
                    Year = g.Key.Year,
                    Month = g.Key.Month,
                    Day = g.Key.Day,
                    TotalRevenue = g.Sum(x => x.FinalPrice),
                    TotalCost = g.Sum(x => x.ActualCost),
                    GrossProfit = g.Sum(x => x.FinalPrice) - g.Sum(x => x.ActualCost),
                    ProfitMargin = g.Sum(x => x.FinalPrice) == 0
                        ? 0
                        : ((g.Sum(x => x.FinalPrice) - g.Sum(x => x.ActualCost)) / g.Sum(x => x.FinalPrice)) * 100
                })
                .OrderBy(x => x.Year)
                .ThenBy(x => x.Month)
                .ThenBy(x => x.Day)
                .ToListAsync(cancellationToken);

            var monthly = await orders
                .GroupBy(o => new { o.Created.Year, o.Created.Month })
                .Select(g => new GrossProfitMarginReportItemDTO
                {
                    Year = g.Key.Year,
                    Month = g.Key.Month,
                    TotalRevenue = g.Sum(x => x.FinalPrice),
                    TotalCost = g.Sum(x => x.ActualCost),
                    GrossProfit = g.Sum(x => x.FinalPrice) - g.Sum(x => x.ActualCost),
                    ProfitMargin = g.Sum(x => x.FinalPrice) == 0
                        ? 0
                        : ((g.Sum(x => x.FinalPrice) - g.Sum(x => x.ActualCost)) / g.Sum(x => x.FinalPrice)) * 100
                })
                .OrderBy(x => x.Year)
                .ThenBy(x => x.Month)
                .ToListAsync(cancellationToken);

            var yearly = await orders
                .GroupBy(o => o.Created.Year)
                .Select(g => new GrossProfitMarginReportItemDTO
                {
                    Year = g.Key,
                    TotalRevenue = g.Sum(x => x.FinalPrice),
                    TotalCost = g.Sum(x => x.ActualCost),
                    GrossProfit = g.Sum(x => x.FinalPrice) - g.Sum(x => x.ActualCost),
                    ProfitMargin = g.Sum(x => x.FinalPrice) == 0
                        ? 0
                        : ((g.Sum(x => x.FinalPrice) - g.Sum(x => x.ActualCost)) / g.Sum(x => x.FinalPrice)) * 100
                })
                .OrderBy(x => x.Year)
                .ToListAsync(cancellationToken);

            return new GrossProfitMarginReportDTO
            {
                Daily = daily,
                Monthly = monthly,
                Yearly = yearly
            };
        }

        public async Task<NetProfitReportDTO> GetNetProfitReport(
            DateTime? fromDate = null,
            DateTime? toDate = null,
            CancellationToken cancellationToken = default)
        {
            var orders = ApplyOrderDateRange(
                _context.Order.Where(o => !o.Deleted && !o.Voided && o.StatusId == 3),
                fromDate,
                toDate);
            var expenses = ApplyExpenseDateRange(
                _context.Expense.Where(e => !e.Deleted),
                fromDate,
                toDate);

            var dailyOrders = await orders
                .GroupBy(o => new { o.Created.Year, o.Created.Month, o.Created.Day })
                .Select(g => new PeriodFinancialAggregate
                {
                    Year = g.Key.Year,
                    Month = g.Key.Month,
                    Day = g.Key.Day,
                    Revenue = g.Sum(x => x.FinalPrice),
                    IngredientCost = g.Sum(x => x.ActualCost)
                })
                .ToListAsync(cancellationToken);
            var dailyExpenses = await expenses
                .GroupBy(e => new { e.ExpenseDate.Year, e.ExpenseDate.Month, e.ExpenseDate.Day })
                .Select(g => new PeriodFinancialAggregate
                {
                    Year = g.Key.Year,
                    Month = g.Key.Month,
                    Day = g.Key.Day,
                    OperatingExpense = g.Sum(x => x.Amount)
                })
                .ToListAsync(cancellationToken);

            var monthlyOrders = await orders
                .GroupBy(o => new { o.Created.Year, o.Created.Month })
                .Select(g => new PeriodFinancialAggregate
                {
                    Year = g.Key.Year,
                    Month = g.Key.Month,
                    Revenue = g.Sum(x => x.FinalPrice),
                    IngredientCost = g.Sum(x => x.ActualCost)
                })
                .ToListAsync(cancellationToken);
            var monthlyExpenses = await expenses
                .GroupBy(e => new { e.ExpenseDate.Year, e.ExpenseDate.Month })
                .Select(g => new PeriodFinancialAggregate
                {
                    Year = g.Key.Year,
                    Month = g.Key.Month,
                    OperatingExpense = g.Sum(x => x.Amount)
                })
                .ToListAsync(cancellationToken);

            var yearlyOrders = await orders
                .GroupBy(o => o.Created.Year)
                .Select(g => new PeriodFinancialAggregate
                {
                    Year = g.Key,
                    Revenue = g.Sum(x => x.FinalPrice),
                    IngredientCost = g.Sum(x => x.ActualCost)
                })
                .ToListAsync(cancellationToken);
            var yearlyExpenses = await expenses
                .GroupBy(e => e.ExpenseDate.Year)
                .Select(g => new PeriodFinancialAggregate
                {
                    Year = g.Key,
                    OperatingExpense = g.Sum(x => x.Amount)
                })
                .ToListAsync(cancellationToken);

            return new NetProfitReportDTO
            {
                Daily = MergeNetProfitPeriods(dailyOrders, dailyExpenses),
                Monthly = MergeNetProfitPeriods(monthlyOrders, monthlyExpenses),
                Yearly = MergeNetProfitPeriods(yearlyOrders, yearlyExpenses)
            };
        }

        public async Task<object> GetBusinessOverviewAsync(
            DateTime fromDate,
            DateTime toDate,
            CancellationToken cancellationToken = default)
        {
            var orders = ApplyOrderDateRange(
                _context.Order.Where(o => !o.Deleted && !o.Voided && o.StatusId == 3),
                fromDate,
                toDate);
            var expenses = ApplyExpenseDateRange(
                _context.Expense.Where(e => !e.Deleted),
                fromDate,
                toDate);

            var orderSummary = await orders
                .GroupBy(_ => 1)
                .Select(g => new
                {
                    TotalRevenue = g.Sum(x => x.FinalPrice),
                    IngredientCost = g.Sum(x => x.ActualCost),
                    TotalOrders = g.Count()
                })
                .SingleOrDefaultAsync(cancellationToken);
            var operatingExpense = await expenses.SumAsync(e => e.Amount, cancellationToken);
            var totalRevenue = orderSummary?.TotalRevenue ?? 0;
            var ingredientCost = orderSummary?.IngredientCost ?? 0;
            var netProfit = totalRevenue - ingredientCost - operatingExpense;

            return new
            {
                TotalRevenue = totalRevenue,
                IngredientCost = ingredientCost,
                OperatingExpense = operatingExpense,
                TotalCost = ingredientCost + operatingExpense,
                GrossProfit = totalRevenue - ingredientCost,
                NetProfit = netProfit,
                NetProfitMargin = totalRevenue == 0 ? 0 : (netProfit / totalRevenue) * 100,
                TotalOrders = orderSummary?.TotalOrders ?? 0
            };
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
                .OrderByDescending(x => x.TotalRevenue)
                .Take(top)
                .ToListAsync();

            return bestSellers;
        }

        public async Task<object> GetBestSellingItemsByCategory(int categoryId, int days = 30, int top = 10)
        {
            var fromDate = DateTime.Now.AddDays(-days);

            var bestSellers = await _context.OrderItem
                .Include(oi => oi.Item)
                    .ThenInclude(i => i.Category)
                .Where(oi =>
                    oi.Created >= fromDate &&
                    !oi.Deleted &&
                    !oi.Voided &&
                    oi.Item != null &&
                    oi.Item.CategoryId == categoryId)
                .GroupBy(oi => new
                {
                    oi.ItemId,
                    ItemName = oi.Name,
                    CategoryId = oi.Item.CategoryId,
                    CategoryName = oi.Item.Category.Name
                })
                .Select(g => new
                {
                    ItemId = g.Key.ItemId,
                    ItemName = g.Key.ItemName,
                    CategoryId = g.Key.CategoryId,
                    CategoryName = g.Key.CategoryName,
                    TotalQuantity = g.Sum(x => x.Quantity),
                    TotalRevenue = g.Sum(x => x.SalePrice * x.Quantity),
                    OrderCount = g.Select(x => x.OrderId).Distinct().Count()
                })
                .OrderByDescending(x => x.TotalRevenue)
                .Take(top)
                .ToListAsync();

            return bestSellers;
        }

        public async Task<object> GetRevenueByCategory(int days = 30)
        {
            var fromDate = DateTime.Now.AddDays(-days);

            var revenueByCategory = await _context.OrderItem
                .Include(oi => oi.Item)
                    .ThenInclude(i => i.Category)
                .Where(oi =>
                    oi.Created >= fromDate &&
                    !oi.Deleted &&
                    !oi.Voided &&
                    oi.Item != null &&
                    oi.Item.Category != null)
                .GroupBy(oi => new
                {
                    oi.Item.CategoryId,
                    CategoryName = oi.Item.Category.Name
                })
                .Select(g => new
                {
                    CategoryId = g.Key.CategoryId,
                    CategoryName = g.Key.CategoryName,
                    TotalRevenue = g.Sum(x => x.SalePrice * x.Quantity),
                    TotalQuantity = g.Sum(x => x.Quantity),
                    OrderCount = g.Select(x => x.OrderId).Distinct().Count()
                })
                .OrderByDescending(x => x.TotalRevenue)
                .ToListAsync();

            return revenueByCategory;
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

        public async Task<object> GetRelativeBusinessSituation()
        {
            var today = DateTime.Now.Date;

            return new
            {
                Today = await GetBusinessSituationRange(today, today.AddDays(1), "Hôm nay"),
                Yesterday = await GetBusinessSituationRange(today.AddDays(-1), today, "Hôm qua"),
                Last7Days = await GetBusinessSituationRange(today.AddDays(-7), today, "7 ngày gần nhất tính đến hôm qua"),
                Last30Days = await GetBusinessSituationRange(today.AddDays(-30), today, "30 ngày gần nhất tính đến hôm qua")
            };
        }

        public object GetChatbotInterpretationNotes()
        {
            return new
            {
                Daily = "Daily chỉ gồm các ngày có doanh thu. Nếu thiếu ngày thì hiểu là không có doanh thu hoặc không có order hoàn tất trong ngày đó.",
                Monthly = "Monthly chỉ gồm các tháng có doanh thu. Nếu thiếu tháng thì hiểu là không có doanh thu hoặc không có order hoàn tất trong tháng đó.",
                RecentRevenueWeek = "Nếu cần nhìn theo 1 tuần có doanh thu gần nhất từ dữ liệu Daily, hãy hiểu là 7 ngày có doanh thu gần nhất, không phải tuần lịch vừa rồi.",
                RecentRevenueMonth = "Nếu cần nhìn theo 1 tháng có doanh thu gần nhất từ dữ liệu Daily, hãy hiểu là 30 ngày có doanh thu gần nhất, không phải tháng lịch vừa rồi."
            };
        }

        private IQueryable<Model.Order> GetRecordedRevenueOrders()
        {
            return _context.Order.Where(order => !order.Deleted && !order.Voided && order.StatusId == 3);
        }

        private static IQueryable<Model.Order> ApplyOrderDateRange(
            IQueryable<Model.Order> query,
            DateTime? fromDate,
            DateTime? toDate)
        {
            if (fromDate.HasValue)
            {
                var from = fromDate.Value.Date;
                query = query.Where(o => o.Created >= from);
            }

            if (toDate.HasValue)
            {
                var toExclusive = toDate.Value.Date.AddDays(1);
                query = query.Where(o => o.Created < toExclusive);
            }

            return query;
        }

        private static IQueryable<Model.Expense> ApplyExpenseDateRange(
            IQueryable<Model.Expense> query,
            DateTime? fromDate,
            DateTime? toDate)
        {
            if (fromDate.HasValue)
            {
                var from = fromDate.Value.Date;
                query = query.Where(e => e.ExpenseDate >= from);
            }

            if (toDate.HasValue)
            {
                var toExclusive = toDate.Value.Date.AddDays(1);
                query = query.Where(e => e.ExpenseDate < toExclusive);
            }

            return query;
        }

        private List<NetProfitReportItemDTO> MergeNetProfitPeriods(
            IEnumerable<PeriodFinancialAggregate> orderPeriods,
            IEnumerable<PeriodFinancialAggregate> expensePeriods)
        {
            return orderPeriods
                .Concat(expensePeriods)
                .GroupBy(x => new { x.Year, x.Month, x.Day })
                .Select(g => CreateNetProfitReportItem(
                    g.Key.Year,
                    g.Key.Month,
                    g.Key.Day,
                    g.Sum(x => x.Revenue),
                    g.Sum(x => x.IngredientCost),
                    g.Sum(x => x.OperatingExpense)))
                .OrderBy(x => x.Year)
                .ThenBy(x => x.Month)
                .ThenBy(x => x.Day)
                .ToList();
        }

        private NetProfitReportItemDTO CreateNetProfitReportItem(
            int year,
            int? month,
            int? day,
            decimal totalRevenue,
            decimal ingredientCost,
            decimal operatingExpense)
        {
            var netProfit = totalRevenue - ingredientCost - operatingExpense;

            return new NetProfitReportItemDTO
            {
                Year = year,
                Month = month,
                Day = day,
                TotalRevenue = totalRevenue,
                IngredientCost = ingredientCost,
                OperatingExpense = operatingExpense,
                NetProfit = netProfit,
                NetProfitMargin = totalRevenue == 0 ? 0 : (netProfit / totalRevenue) * 100
            };
        }

        private async Task<object> GetBusinessSituationRange(DateTime fromDate, DateTime toDate, string label)
        {
            var orders = await _context.Order
                .Where(o => !o.Deleted && !o.Voided && o.StatusId == 3 && o.Created >= fromDate && o.Created < toDate)
                .ToListAsync();

            return new
            {
                Label = label,
                FromDate = fromDate,
                ToDate = toDate.AddDays(-1),
                TotalRevenue = orders.Sum(x => x.FinalPrice),
                TotalCost = orders.Sum(x => x.ActualCost),
                TotalProfit = orders.Sum(x => x.ActualProfit),
                TotalOrders = orders.Count,
                AverageOrderValue = orders.Count > 0 ? orders.Average(x => x.FinalPrice) : 0
            };
        }

        private sealed class PeriodFinancialAggregate
        {
            public int Year { get; set; }
            public int? Month { get; set; }
            public int? Day { get; set; }
            public decimal Revenue { get; set; }
            public decimal IngredientCost { get; set; }
            public decimal OperatingExpense { get; set; }
        }
    }
}
