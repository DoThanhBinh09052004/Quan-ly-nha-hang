using Microsoft.EntityFrameworkCore;
using QLNH_API.Data;

namespace QLNH_API.Services
{
    /// <summary>
    /// Keeps the legacy StockQuantity aggregate aligned with usable batches so
    /// existing readers, including the AI service, never count expired stock.
    /// </summary>
    public sealed class IngredientStockSyncService : BackgroundService
    {
        private const double QuantityTolerance = 0.000001d;
        private readonly IServiceScopeFactory _scopeFactory;
        private readonly ILogger<IngredientStockSyncService> _logger;

        public IngredientStockSyncService(
            IServiceScopeFactory scopeFactory,
            ILogger<IngredientStockSyncService> logger)
        {
            _scopeFactory = scopeFactory;
            _logger = logger;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            await SynchronizeAsync(stoppingToken);

            using var timer = new PeriodicTimer(TimeSpan.FromHours(1));
            while (await timer.WaitForNextTickAsync(stoppingToken))
            {
                await SynchronizeAsync(stoppingToken);
            }
        }

        private async Task SynchronizeAsync(CancellationToken cancellationToken)
        {
            try
            {
                using var scope = _scopeFactory.CreateScope();
                var context = scope.ServiceProvider.GetRequiredService<ApplicationDbcontext>();
                var today = DateTime.Today;
                var ingredients = await context.Ingredient
                    .Include(i => i.Batches)
                    .Where(i => !i.Deleted)
                    .ToListAsync(cancellationToken);

                var changed = false;
                foreach (var ingredient in ingredients)
                {
                    var usableStock = ingredient.Batches
                        .Where(b => !b.Deleted &&
                                    b.ExpirationDate >= today &&
                                    b.RemainingQuantity > QuantityTolerance)
                        .Sum(b => b.RemainingQuantity);

                    if (Math.Abs(ingredient.StockQuantity - usableStock) <= QuantityTolerance)
                        continue;

                    ingredient.StockQuantity = usableStock;
                    ingredient.Updated = DateTime.Now;
                    changed = true;
                }

                if (changed)
                    await context.SaveChangesAsync(cancellationToken);
            }
            catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
            {
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Không thể đồng bộ tồn kho nguyên liệu theo lô");
            }
        }
    }
}
