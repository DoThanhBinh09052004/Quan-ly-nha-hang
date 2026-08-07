using Microsoft.EntityFrameworkCore;
using QLNH_API.Data;
using QLNH_API.DTO;
using QLNH_API.Model;

namespace QLNH_API.Services
{
    public sealed class IngredientInventoryException : Exception
    {
        public IngredientInventoryException(string message, IReadOnlyCollection<IngredientShortageDTO>? shortages = null)
            : base(message)
        {
            Shortages = shortages ?? Array.Empty<IngredientShortageDTO>();
        }

        public IReadOnlyCollection<IngredientShortageDTO> Shortages { get; }
    }

    public sealed record OrderItemReservation(OrderItem OrderItem, int Quantity);

    public class IngredientInventoryService
    {
        private const double QuantityTolerance = 0.000001d;
        private readonly ApplicationDbcontext _context;
        private readonly StatusResolver _statusResolver;

        public IngredientInventoryService(ApplicationDbcontext context, StatusResolver statusResolver)
        {
            _context = context;
            _statusResolver = statusResolver;
        }

        public async Task ReserveAsync(IReadOnlyCollection<OrderItemReservation> reservations)
        {
            var validReservations = reservations
                .Where(r => r.Quantity > 0 && r.OrderItem.ItemId.HasValue)
                .ToList();

            if (validReservations.Count == 0)
                return;

            var itemIds = validReservations
                .Select(r => r.OrderItem.ItemId!.Value)
                .Distinct()
                .ToList();

            var recipes = await _context.Recipe
                .Include(r => r.Ingredient)
                .Where(r => itemIds.Contains(r.ItemId) && r.Ingredient != null && !r.Ingredient.Deleted)
                .ToListAsync();

            var recipesByItem = recipes
                .GroupBy(r => r.ItemId)
                .ToDictionary(g => g.Key, g => g.ToList());

            var requiredByIngredient = new Dictionary<int, double>();
            foreach (var reservation in validReservations)
            {
                if (!recipesByItem.TryGetValue(reservation.OrderItem.ItemId!.Value, out var itemRecipes))
                    continue;

                foreach (var recipe in itemRecipes)
                {
                    var required = recipe.QuantityNeeded * reservation.Quantity;
                    requiredByIngredient[recipe.IngredientId] =
                        requiredByIngredient.GetValueOrDefault(recipe.IngredientId) + required;
                }
            }

            if (requiredByIngredient.Count == 0)
                return;

            var ingredientIds = requiredByIngredient.Keys.ToList();
            var today = DateTime.Today;
            var batches = await _context.IngredientBatch
                .Include(b => b.Ingredient)
                .Where(b => ingredientIds.Contains(b.IngredientId) &&
                            !b.Deleted &&
                            b.RemainingQuantity > QuantityTolerance &&
                            b.ExpirationDate >= today)
                .OrderBy(b => b.ExpirationDate)
                .ThenBy(b => b.ReceivedDate)
                .ThenBy(b => b.Id)
                .ToListAsync();

            var availableByIngredient = batches
                .GroupBy(b => b.IngredientId)
                .ToDictionary(g => g.Key, g => g.Sum(b => b.RemainingQuantity));

            var shortages = requiredByIngredient
                .Select(pair =>
                {
                    var ingredient = recipes.First(r => r.IngredientId == pair.Key).Ingredient!;
                    return new IngredientShortageDTO
                    {
                        IngredientId = ingredient.Id,
                        IngredientName = ingredient.Name,
                        Unit = ingredient.Unit,
                        Required = pair.Value,
                        Available = availableByIngredient.GetValueOrDefault(pair.Key)
                    };
                })
                .Where(row => row.Available + QuantityTolerance < row.Required)
                .ToList();

            if (shortages.Count > 0)
            {
                throw new IngredientInventoryException("Không đủ lô nguyên liệu còn hạn sử dụng để lưu đơn hàng", shortages);
            }

            // StockQuantity is a compatibility aggregate for existing consumers such as the AI service.
            foreach (var ingredientId in ingredientIds)
            {
                var ingredient = recipes.First(r => r.IngredientId == ingredientId).Ingredient!;
                ingredient.StockQuantity = availableByIngredient.GetValueOrDefault(ingredientId);
            }

            var orderItemIds = validReservations.Select(r => r.OrderItem.Id).Distinct().ToList();
            var allocations = await _context.OrderItemIngredientAllocation
                .Where(a => orderItemIds.Contains(a.OrderItemId) && ingredientIds.Contains(a.IngredientId))
                .ToListAsync();

            foreach (var reservation in validReservations)
            {
                if (!recipesByItem.TryGetValue(reservation.OrderItem.ItemId!.Value, out var itemRecipes))
                    continue;

                foreach (var recipe in itemRecipes)
                {
                    var quantityToReserve = recipe.QuantityNeeded * reservation.Quantity;
                    var ingredientBatches = batches.Where(b => b.IngredientId == recipe.IngredientId);

                    foreach (var batch in ingredientBatches)
                    {
                        if (quantityToReserve <= QuantityTolerance)
                            break;

                        var quantityFromBatch = Math.Min(batch.RemainingQuantity, quantityToReserve);
                        if (quantityFromBatch <= QuantityTolerance)
                            continue;

                        batch.RemainingQuantity -= quantityFromBatch;
                        batch.Updated = DateTime.Now;
                        batch.Ingredient!.StockQuantity -= quantityFromBatch;
                        batch.Ingredient.Updated = DateTime.Now;

                        var allocation = allocations.FirstOrDefault(a =>
                            a.OrderItemId == reservation.OrderItem.Id &&
                            a.IngredientId == recipe.IngredientId &&
                            a.IngredientBatchId == batch.Id);

                        if (allocation == null)
                        {
                            allocation = new OrderItemIngredientAllocation
                            {
                                OrderItemId = reservation.OrderItem.Id,
                                IngredientId = recipe.IngredientId,
                                IngredientBatchId = batch.Id,
                                UnitCost = batch.UnitCost,
                                ReservedQuantity = quantityFromBatch,
                                Created = DateTime.Now,
                                Updated = DateTime.Now
                            };
                            allocations.Add(allocation);
                            _context.OrderItemIngredientAllocation.Add(allocation);
                        }
                        else
                        {
                            allocation.ReservedQuantity += quantityFromBatch;
                            allocation.Updated = DateTime.Now;
                        }

                        quantityToReserve -= quantityFromBatch;
                    }
                }
            }
        }

        public async Task ReleasePendingReductionAsync(OrderItem orderItem, int newQuantity)
        {
            if (newQuantity < 0 || newQuantity >= orderItem.Quantity || orderItem.Quantity <= 0)
                return;

            var removedQuantity = orderItem.Quantity - newQuantity;
            var releaseRatio = (double)removedQuantity / orderItem.Quantity;
            var allocations = await GetAllocationsWithInventoryAsync(orderItem.Id);

            foreach (var allocation in allocations)
            {
                var returned = allocation.ReservedQuantity * releaseRatio;
                ReturnReservedQuantity(allocation, returned);
            }
        }

        public async Task ReleaseAllReservedAsync(OrderItem orderItem)
        {
            var allocations = await GetAllocationsWithInventoryAsync(orderItem.Id);

            foreach (var allocation in allocations)
            {
                ReturnReservedQuantity(allocation, allocation.ReservedQuantity);
            }
        }

        public async Task ConsumeAllReservedAsync(OrderItem orderItem)
        {
            var allocations = await _context.OrderItemIngredientAllocation
                .Where(a => a.OrderItemId == orderItem.Id)
                .ToListAsync();

            foreach (var allocation in allocations)
            {
                allocation.ConsumedQuantity += allocation.ReservedQuantity;
                allocation.ReservedQuantity = 0;
                allocation.Updated = DateTime.Now;
            }
        }

        public async Task<decimal?> CalculateOrderIngredientCostAsync(int orderId)
        {
            var rows = await _context.OrderItemIngredientAllocation
                .Where(a => a.OrderItem != null &&
                            a.OrderItem.OrderId == orderId &&
                            !a.OrderItem.Deleted &&
                            !a.OrderItem.Voided)
                .Select(a => new
                {
                    a.UnitCost,
                    Quantity = a.ReservedQuantity + a.ConsumedQuantity
                })
                .ToListAsync();

            return rows.Count == 0
                ? null
                : rows.Sum(row => row.UnitCost * (decimal)row.Quantity);
        }

        public async Task ReleaseForDeletionAsync(OrderItem orderItem)
        {
            var pendingStatusId = await _statusResolver.GetIdAsync(StatusResolver.OrderItemPending);
            if (!orderItem.CookingStatusId.HasValue || orderItem.CookingStatusId == pendingStatusId)
            {
                await ReleaseAllReservedAsync(orderItem);
            }
        }

        public async Task HandleStatusTransitionAsync(OrderItem orderItem, int oldStatusId, int newStatusId)
        {
            if (oldStatusId == newStatusId)
                return;

            var statusIds = await _statusResolver.GetIdsAsync(
                StatusResolver.OrderItemPending,
                StatusResolver.OrderItemProcessing,
                StatusResolver.OrderItemCompleted,
                StatusResolver.OrderItemCancelled);

            var pendingStatusId = statusIds[0];
            var processingStatusId = statusIds[1];
            var completedStatusId = statusIds[2];
            var cancelledStatusId = statusIds[3];

            if (newStatusId != pendingStatusId && newStatusId != processingStatusId &&
                newStatusId != completedStatusId && newStatusId != cancelledStatusId)
            {
                throw new IngredientInventoryException("Trạng thái chế biến không hợp lệ");
            }

            if (oldStatusId == completedStatusId || oldStatusId == cancelledStatusId)
            {
                throw new IngredientInventoryException("Không thể thay đổi trạng thái của món đã hoàn thành hoặc đã hủy");
            }

            if (oldStatusId == processingStatusId && newStatusId == pendingStatusId)
            {
                throw new IngredientInventoryException("Không thể chuyển món đang chế biến về trạng thái chờ");
            }

            if (oldStatusId == pendingStatusId && newStatusId == cancelledStatusId)
            {
                await ReleaseAllReservedAsync(orderItem);
                return;
            }

            if (oldStatusId == pendingStatusId &&
                (newStatusId == processingStatusId || newStatusId == completedStatusId))
            {
                await ConsumeAllReservedAsync(orderItem);
            }
        }

        private void ReturnReservedQuantity(OrderItemIngredientAllocation allocation, double quantity)
        {
            if (quantity <= QuantityTolerance)
                return;

            allocation.ReservedQuantity -= quantity;
            allocation.ReturnedQuantity += quantity;
            allocation.Updated = DateTime.Now;

            if (allocation.IngredientBatch != null)
            {
                allocation.IngredientBatch.RemainingQuantity += quantity;
                allocation.IngredientBatch.Updated = DateTime.Now;

                if (!allocation.IngredientBatch.Deleted && allocation.IngredientBatch.ExpirationDate >= DateTime.Today)
                {
                    allocation.Ingredient!.StockQuantity += quantity;
                    allocation.Ingredient.Updated = DateTime.Now;
                }
            }
            else
            {
                // Supports allocations created before batch tracking was introduced.
                allocation.Ingredient!.StockQuantity += quantity;
                allocation.Ingredient.Updated = DateTime.Now;
            }
        }

        private async Task<List<OrderItemIngredientAllocation>> GetAllocationsWithInventoryAsync(int orderItemId)
        {
            return await _context.OrderItemIngredientAllocation
                .Include(a => a.Ingredient)
                .Include(a => a.IngredientBatch)
                .Where(a => a.OrderItemId == orderItemId)
                .ToListAsync();
        }
    }
}
