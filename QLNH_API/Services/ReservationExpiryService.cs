using Microsoft.EntityFrameworkCore;
using QLNH_API.Data;
using QLNH_API.Model;

namespace QLNH_API.Services
{
    public sealed class ReservationExpiryService : BackgroundService
    {
        private readonly IServiceScopeFactory _scopeFactory;
        private readonly ILogger<ReservationExpiryService> _logger;

        public ReservationExpiryService(
            IServiceScopeFactory scopeFactory,
            ILogger<ReservationExpiryService> logger)
        {
            _scopeFactory = scopeFactory;
            _logger = logger;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            while (!stoppingToken.IsCancellationRequested)
            {
                try
                {
                    using var scope = _scopeFactory.CreateScope();
                    var context = scope.ServiceProvider.GetRequiredService<ApplicationDbcontext>();
                    var reservationService = scope.ServiceProvider.GetRequiredService<ReservationService>();
                    var policy = scope.ServiceProvider
                        .GetRequiredService<Microsoft.Extensions.Options.IOptions<ReservationPolicyOptions>>()
                        .Value;
                    var now = DateTime.Now;

                    var expired = await context.Reservation
                        .Where(r => !r.Deleted && r.Status == ReservationStatuses.Confirmed &&
                            r.ReservationTime.AddMinutes(policy.LateArrivalGraceMinutes) < now)
                        .ToListAsync(stoppingToken);

                    var activeHoldTableIds = await context.Reservation
                        .Where(r => !r.Deleted && r.Status == ReservationStatuses.Confirmed &&
                            r.ReservationTime.AddMinutes(-policy.LockBeforeMinutes) <= now &&
                            r.ReservationTime.AddMinutes(policy.LateArrivalGraceMinutes) >= now)
                        .Select(r => r.GuestTableId)
                        .Distinct()
                        .ToListAsync(stoppingToken);

                    if (expired.Count > 0)
                    {
                        foreach (var reservation in expired)
                        {
                            reservation.Status = ReservationStatuses.NoShow;
                            reservation.Updated = now;
                        }
                        await context.SaveChangesAsync(stoppingToken);
                    }

                    var affectedTableIds = expired.Select(r => r.GuestTableId)
                        .Concat(activeHoldTableIds)
                        .Distinct();
                    foreach (var tableId in affectedTableIds)
                    {
                        await reservationService.RefreshTableStatusAsync(tableId);
                    }
                }
                catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
                {
                    break;
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error expiring overdue reservations.");
                }

                await Task.Delay(TimeSpan.FromMinutes(1), stoppingToken);
            }
        }
    }
}
