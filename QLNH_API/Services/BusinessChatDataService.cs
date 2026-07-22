using System.Globalization;
using System.Text;
using System.Text.RegularExpressions;
using QLNH_API.DTO;

namespace QLNH_API.Services
{
    public sealed class BusinessChatDataService
    {
        private const int DefaultRangeDays = 30;
        private readonly RevenueService _revenueService;

        public BusinessChatDataService(RevenueService revenueService)
        {
            _revenueService = revenueService;
        }

        public async Task<RevenueBusinessSnapshotDto> GetSnapshotAsync(
            string message,
            BusinessChatRequestDto request,
            CancellationToken cancellationToken = default)
        {
            var normalizedMessage = NormalizeText(message);
            var scopes = DetectScopes(normalizedMessage);
            var (fromDate, toDate, rangeDays) = ResolveDateRange(normalizedMessage);
            var snapshot = new RevenueBusinessSnapshotDto
            {
                FromDate = fromDate,
                ToDate = toDate
            };

            if (scopes.HasFlag(DataScope.Overview))
            {
                snapshot.Overview = await _revenueService.GetBusinessOverviewAsync(fromDate, toDate, cancellationToken);
                snapshot.DataScopes.Add("overview");
            }

            if (scopes.HasFlag(DataScope.RevenueTrend))
            {
                snapshot.Daily = await _revenueService.GetRevenueByDay(fromDate, toDate, cancellationToken);
                snapshot.Monthly = await _revenueService.GetRevenueByMonth(fromDate, toDate, cancellationToken);
                snapshot.DataScopes.Add("daily");
                snapshot.DataScopes.Add("monthly");
            }

            if (scopes.HasFlag(DataScope.GrossProfit))
            {
                snapshot.GrossProfitReport = await _revenueService
                    .GetGrossProfitAndProfitMarginReport(fromDate, toDate, cancellationToken);
                snapshot.DataScopes.Add("grossProfitReport");
            }

            if (scopes.HasFlag(DataScope.NetProfit))
            {
                snapshot.NetProfitReport = await _revenueService
                    .GetNetProfitReport(fromDate, toDate, cancellationToken);
                snapshot.DataScopes.Add("netProfitReport");
            }

            cancellationToken.ThrowIfCancellationRequested();
            if (scopes.HasFlag(DataScope.ByHour))
            {
                snapshot.ByHour = await _revenueService.GetRevenueByHour(rangeDays);
                snapshot.DataScopes.Add("byHour");
            }

            cancellationToken.ThrowIfCancellationRequested();
            if (scopes.HasFlag(DataScope.ByDayOfWeek))
            {
                snapshot.ByDayOfWeek = await _revenueService.GetRevenueByDayOfWeek(rangeDays);
                snapshot.DataScopes.Add("byDayOfWeek");
            }

            cancellationToken.ThrowIfCancellationRequested();
            if (scopes.HasFlag(DataScope.BestSellers))
            {
                snapshot.BestSellers = await _revenueService.GetBestSellingItems(
                    rangeDays,
                    Math.Clamp(request.TopBest, 1, 50));
                snapshot.DataScopes.Add("bestSellers");
            }

            cancellationToken.ThrowIfCancellationRequested();
            if (scopes.HasFlag(DataScope.ByCategory))
            {
                snapshot.ByCategory = await _revenueService.GetRevenueByCategory(rangeDays);
                snapshot.DataScopes.Add("byCategory");
            }

            cancellationToken.ThrowIfCancellationRequested();
            if (scopes.HasFlag(DataScope.TableTurnover))
            {
                snapshot.TableTurnover = await _revenueService.GetTableTurnoverAnalysis(rangeDays);
                snapshot.DataScopes.Add("tableTurnover");
            }

            cancellationToken.ThrowIfCancellationRequested();
            if (scopes.HasFlag(DataScope.ByPartySize))
            {
                snapshot.ByPartySize = await _revenueService.GetRevenueByPartySize(rangeDays);
                snapshot.DataScopes.Add("byPartySize");
            }

            cancellationToken.ThrowIfCancellationRequested();
            if (scopes.HasFlag(DataScope.Forecast))
            {
                snapshot.Forecast = await _revenueService.GetRevenueForecast(Math.Clamp(request.DaysForecast, 1, 30));
                snapshot.DataScopes.Add("forecast");
            }

            return snapshot;
        }

        public static string DetermineIntent(string message)
        {
            var text = NormalizeText(message);
            if (HasAny(text, "goi y", "de xuat", "khuyen nghi", "nen ban", "combo", "recommend", "recommendation", "suggest", "upsell", "cross-sell"))
                return "recommendation";
            if (HasAny(text, "so sanh", "so voi", "chenh lech", "khac nhau", "compare", "comparison", "difference", " vs "))
                return "compare";
            if (HasAny(text, "tai sao", "nguyen nhan", "van de", "sut giam", "chan doan", "problem", "why", "diagnose", "diagnosis", "cause"))
                return "diagnosis";
            if (HasAny(text, "xu huong", "bien dong", "tang", "giam", "cao diem", "trend", "increase", "decrease", "growth", "peak"))
                return "trend";
            if (HasAny(text, "tom tat", "tong quan", "nhin chung", "overview", "summary", "summarize"))
                return "summary";

            return "summary";
        }

        private static DataScope DetectScopes(string text)
        {
            var scopes = DataScope.None;
            var asksForecast = HasAny(text, "du bao", "forecast", "predict", "tuan toi", "thang toi");
            var asksRevenue = HasAny(text, "doanh thu", "revenue", "sales");
            var asksRevenueAnomaly = asksRevenue && HasAny(
                text,
                "bat thuong", "van de", "khong co doanh thu", "doanh thu thap", "sut giam", "giam manh",
                "anomaly", "abnormal", "issue", "no revenue", "zero revenue");

            if (asksForecast)
                scopes |= DataScope.Forecast;

            if (HasAny(text, "lai lo", "profit and loss", "profit/loss", "p&l"))
                scopes |= DataScope.GrossProfit | DataScope.NetProfit;
            else
            {
                if (HasAny(text, "lai gop", "gross profit", "bien loi nhuan", "profit margin", "chi phi nguyen lieu", "gia von"))
                    scopes |= DataScope.GrossProfit;
                if (HasAny(text, "lai rong", "lo rong", "net profit", "thua lo", "chi phi van hanh", "operating expense", "loss") ||
                    Regex.IsMatch(text, @"\blo\b", RegexOptions.CultureInvariant))
                    scopes |= DataScope.NetProfit;
                if (HasAny(text, "loi nhuan", "chi phi") &&
                    !scopes.HasFlag(DataScope.GrossProfit) &&
                    !scopes.HasFlag(DataScope.NetProfit))
                {
                    scopes |= DataScope.GrossProfit | DataScope.NetProfit;
                }
            }

            var asksPeriodComparison =
                HasAny(text, "so sanh", "so voi", "chenh lech", "khac nhau", "compare", "comparison", "difference", " vs ") &&
                HasAny(text, "ngay", "tuan", "thang", "quy", "nam", "day", "week", "month", "quarter", "year");
            if (asksPeriodComparison || asksRevenueAnomaly ||
                HasAny(text, "xu huong doanh thu", "bien dong doanh thu", "tang giam doanh thu", "doanh thu theo ngay", "doanh thu theo thang", "revenue trend", "daily revenue", "monthly revenue"))
                scopes |= DataScope.RevenueTrend;

            if (HasAny(text, "gio cao diem", "khung gio", "theo gio", "thoi diem ban hang", "peak hour", "busy hour"))
                scopes |= DataScope.ByHour;
            if (HasAny(text, "theo thu", "thu nao", "ngay nao ban", "thoi diem ban hang", "day of week", "weekday", "cuoi tuan", "weekend"))
                scopes |= DataScope.ByDayOfWeek;
            if (HasAny(text, "mon ban chay", "mon ban tot", "mon nao", "ban chay nhat", "best seller", "best-selling", "top mon"))
                scopes |= DataScope.BestSellers;
            if (HasAny(text, "danh muc", "category", "nhom mon"))
                scopes |= DataScope.ByCategory;
            if (HasAny(text, "menu", "thuc don"))
                scopes |= DataScope.BestSellers | DataScope.ByCategory;
            if (HasAny(text, "vong quay ban", "hieu suat ban", "ban nao", "ban an", "table turnover", "thoi gian dung ban", "table performance"))
                scopes |= DataScope.TableTurnover;
            if (HasAny(text, "so khach", "luong khach", "nhom khach", "party size", "guest count"))
                scopes |= DataScope.ByPartySize;

            var asksOverview = HasAny(text, "tong quan", "tinh hinh kinh doanh", "overview", "summary", "tom tat");
            if (asksOverview || asksRevenueAnomaly ||
                (asksRevenue && !asksForecast && !scopes.HasFlag(DataScope.RevenueTrend)))
                scopes |= DataScope.Overview;

            return scopes == DataScope.None ? DataScope.Overview : scopes;
        }

        private static (DateTime FromDate, DateTime ToDate, int RangeDays) ResolveDateRange(string text)
        {
            var today = DateTime.Now.Date;
            if (HasAny(text, "hom nay", "today"))
                return (today, today, 1);
            if (HasAny(text, "hom qua", "yesterday"))
                return (today.AddDays(-1), today.AddDays(-1), 1);

            var monthMatch = Regex.Match(text, @"\b(?<months>\d{1,2})\s*(thang|months?)\b", RegexOptions.CultureInvariant);
            if (monthMatch.Success && int.TryParse(monthMatch.Groups["months"].Value, out var requestedMonths))
            {
                var months = Math.Clamp(requestedMonths, 1, 24);
                var fromDate = new DateTime(today.Year, today.Month, 1).AddMonths(-(months - 1));
                return (fromDate, today, (today - fromDate).Days + 1);
            }

            var dayMatch = Regex.Match(text, @"\b(?<days>\d{1,3})\s*(ngay|days?)\b", RegexOptions.CultureInvariant);
            var rangeDays = dayMatch.Success && int.TryParse(dayMatch.Groups["days"].Value, out var requestedDays)
                ? Math.Clamp(requestedDays, 1, 365)
                : DefaultRangeDays;

            return (today.AddDays(-(rangeDays - 1)), today, rangeDays);
        }

        private static string NormalizeText(string value)
        {
            if (string.IsNullOrWhiteSpace(value))
                return string.Empty;

            var decomposed = value.Trim().ToLowerInvariant().Normalize(NormalizationForm.FormD);
            var builder = new StringBuilder(decomposed.Length);
            foreach (var character in decomposed)
            {
                if (CharUnicodeInfo.GetUnicodeCategory(character) != UnicodeCategory.NonSpacingMark)
                    builder.Append(character == 'đ' ? 'd' : character);
            }

            return Regex.Replace(builder.ToString().Normalize(NormalizationForm.FormC), @"\s+", " ");
        }

        private static bool HasAny(string text, params string[] keywords)
        {
            return keywords.Any(keyword => text.Contains(keyword, StringComparison.Ordinal));
        }

        [Flags]
        private enum DataScope
        {
            None = 0,
            Overview = 1 << 0,
            RevenueTrend = 1 << 1,
            GrossProfit = 1 << 2,
            NetProfit = 1 << 3,
            ByHour = 1 << 4,
            ByDayOfWeek = 1 << 5,
            BestSellers = 1 << 6,
            ByCategory = 1 << 7,
            TableTurnover = 1 << 8,
            ByPartySize = 1 << 9,
            Forecast = 1 << 10
        }
    }
}
