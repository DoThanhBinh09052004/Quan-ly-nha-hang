using Microsoft.EntityFrameworkCore;
using QLNH_API.Data;

namespace QLNH_API.Services
{
    public class PaymentExpiryService : BackgroundService
    {
        private readonly IServiceScopeFactory _scopeFactory;
        private readonly ILogger<PaymentExpiryService> _logger;

        public PaymentExpiryService(IServiceScopeFactory scopeFactory, ILogger<PaymentExpiryService> logger)
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
                    var now = DateTime.Now;

                    var expiredPayments = await context.Payment
                        .Where(p => p.Status == "PENDING" && p.ExpiresAt != null && p.ExpiresAt <= now)
                        .ToListAsync(stoppingToken);

                    if (expiredPayments.Any())
                    {
                        foreach (var payment in expiredPayments)
                        {
                            payment.Status = "EXPIRED";
                            payment.Updated = now;
                        }

                        await context.SaveChangesAsync(stoppingToken);
                    }
                }
                catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
                {
                    break;
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error expiring pending payments.");
                }

                await Task.Delay(TimeSpan.FromMinutes(1), stoppingToken);
            }
        }
    }
}
