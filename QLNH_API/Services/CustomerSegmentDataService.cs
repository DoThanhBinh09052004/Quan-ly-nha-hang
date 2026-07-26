using Microsoft.EntityFrameworkCore;
using QLNH_API.Data;
using QLNH_API.DTO;

namespace QLNH_API.Services
{
    public sealed class CustomerSegmentDataService
    {
        private readonly ApplicationDbcontext _context;

        public CustomerSegmentDataService(ApplicationDbcontext context)
        {
            _context = context;
        }

        public async Task<AiCustomerSegmentRequestDto?> GetPayloadAsync(
            int targetGuestId,
            CancellationToken cancellationToken = default)
        {
            var guests = await _context.Guest
                .AsNoTracking()
                .Where(g => !g.Deleted)
                .Select(g => new { g.Id, g.Points, g.Created })
                .ToListAsync(cancellationToken);

            if (!guests.Any(g => g.Id == targetGuestId))
                return null;

            var guestIds = guests.Select(g => g.Id).ToList();
            var orders = await _context.Order
                .AsNoTracking()
                .Where(o => guestIds.Contains(o.GuestId ?? 0)
                    && !o.Deleted && !o.Voided && o.StatusId == 3)
                .Select(o => new CompletedOrderFeatureRow
                {
                    GuestId = o.GuestId!.Value,
                    Created = o.Created,
                    FinalPrice = o.FinalPrice,
                    PartySize = o.PartySize,
                    CheckInTime = o.CheckInTime,
                    CheckOutTime = o.CheckOutTime
                })
                .ToListAsync(cancellationToken);

            var ordersByGuest = orders.GroupBy(o => o.GuestId)
                .ToDictionary(group => group.Key, group => group.ToList());
            var now = DateTime.Now;

            return new AiCustomerSegmentRequestDto
            {
                TargetGuestId = targetGuestId,
                Guests = guests.Select(guest => new AiCustomerSegmentGuestDto
                {
                    GuestId = guest.Id,
                    Features = BuildFeatures(
                        guest.Points,
                        guest.Created,
                        ordersByGuest.GetValueOrDefault(guest.Id, new List<CompletedOrderFeatureRow>()),
                        now)
                }).ToList()
            };
        }

        private static Dictionary<string, double> BuildFeatures(
            int points,
            DateTime created,
            IEnumerable<CompletedOrderFeatureRow> orders,
            DateTime now)
        {
            var guestOrders = orders.ToList();
            if (guestOrders.Count == 0)
            {
                return new Dictionary<string, double>
                {
                    ["recency_days"] = Math.Max(0, Math.Floor((now - created).TotalDays)),
                    ["frequency"] = 0,
                    ["monetary_sum"] = 0,
                    ["monetary_avg"] = 0,
                    ["party_avg"] = 0,
                    ["duration_avg"] = 0,
                    ["weekend_ratio"] = 0,
                    ["evening_ratio"] = 0,
                    ["tenure_days"] = 0,
                    ["points"] = points,
                    ["account_age_days"] = Math.Max(0, Math.Floor((now - created).TotalDays))
                };
            }

            var durations = guestOrders
                .Where(o => o.CheckInTime != null && o.CheckOutTime != null)
                .Select(o => Math.Floor((o.CheckOutTime.Value - o.CheckInTime.Value).TotalMinutes))
                .ToList();
            var lastOrder = guestOrders.Max(o => o.Created);
            var firstOrder = guestOrders.Min(o => o.Created);
            var weekendCount = guestOrders.Count(o => o.Created.DayOfWeek is DayOfWeek.Saturday or DayOfWeek.Sunday);
            var eveningCount = guestOrders.Count(o => (o.CheckInTime?.Hour ?? o.Created.Hour) is >= 17 and <= 23);
            var totalRevenue = guestOrders.Sum(o => o.FinalPrice);

            return new Dictionary<string, double>
            {
                ["recency_days"] = Math.Max(0, Math.Floor((now - lastOrder).TotalDays)),
                ["frequency"] = guestOrders.Count,
                ["monetary_sum"] = (double)totalRevenue,
                ["monetary_avg"] = (double)(totalRevenue / guestOrders.Count),
                ["party_avg"] = guestOrders.Average(o => (double)o.PartySize),
                ["duration_avg"] = durations.Count == 0 ? 0 : durations.Average(),
                ["weekend_ratio"] = (double)weekendCount / guestOrders.Count,
                ["evening_ratio"] = (double)eveningCount / guestOrders.Count,
                ["tenure_days"] = Math.Max(0, Math.Floor((now - firstOrder).TotalDays)),
                ["points"] = points,
                ["account_age_days"] = Math.Max(0, Math.Floor((now - created).TotalDays))
            };
        }

        private sealed class CompletedOrderFeatureRow
        {
            public int GuestId { get; init; }
            public DateTime Created { get; init; }
            public decimal FinalPrice { get; init; }
            public int PartySize { get; init; }
            public DateTime? CheckInTime { get; init; }
            public DateTime? CheckOutTime { get; init; }
        }
    }
}
