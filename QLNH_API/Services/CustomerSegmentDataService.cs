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

        public async Task<AiCustomerSegmentRequestDto?> GetPayloadAsync(int guestId, CancellationToken cancellationToken = default)
        {
            var guest = await _context.Guest
                .AsNoTracking()
                .FirstOrDefaultAsync(g => g.Id == guestId && !g.Deleted, cancellationToken);

            if (guest == null) return null;

            var orders = await _context.Order
                .AsNoTracking()
                .Where(o => o.GuestId == guestId && !o.Deleted && !o.Voided && o.StatusId == 3)
                .ToListAsync(cancellationToken);

            if (orders.Count == 0)
            {
                return new AiCustomerSegmentRequestDto
                {
                    Guest = new AiCustomerSegmentGuestDto
                    {
                        GuestId = guest.Id,
                        Points = guest.Points,
                        Created = guest.Created
                    }
                };
            }

            var now = DateTime.Now;
            var durations = orders
                .Where(o => o.CheckInTime.HasValue && o.CheckOutTime.HasValue)
                .Select(o => Math.Floor((o.CheckOutTime!.Value - o.CheckInTime!.Value).TotalMinutes))
                .ToList();

            var eveningCount = orders.Count(o => (o.CheckInTime?.Hour ?? o.Created.Hour) is >= 17 and <= 23);
            var weekendCount = orders.Count(o => o.Created.DayOfWeek is DayOfWeek.Saturday or DayOfWeek.Sunday);
            var lastOrder = orders.Max(o => o.Created);
            var firstOrder = orders.Min(o => o.Created);
            var totalRevenue = orders.Sum(o => o.FinalPrice);

            var features = new Dictionary<string, double>
            {
                ["recency_days"] = Math.Max(0, Math.Floor((now - lastOrder).TotalDays)),
                ["frequency"] = orders.Count,
                ["monetary_sum"] = (double)totalRevenue,
                ["monetary_avg"] = orders.Count == 0 ? 0 : (double)(totalRevenue / orders.Count),
                ["party_avg"] = orders.Count == 0 ? 0 : orders.Average(o => o.PartySize),
                ["duration_avg"] = durations.Count == 0 ? 0 : durations.Average(),
                ["weekend_ratio"] = orders.Count == 0 ? 0 : (double)weekendCount / orders.Count,
                ["evening_ratio"] = orders.Count == 0 ? 0 : (double)eveningCount / orders.Count,
                ["tenure_days"] = Math.Max(0, Math.Floor((now - firstOrder).TotalDays)),
                ["Points"] = guest.Points,
                ["account_age_days"] = Math.Max(0, Math.Floor((now - guest.Created).TotalDays))
            };

            return new AiCustomerSegmentRequestDto
            {
                Guest = new AiCustomerSegmentGuestDto
                {
                    GuestId = guest.Id,
                    Points = guest.Points,
                    Created = guest.Created
                },
                Features = features
            };
        }
    }
}
