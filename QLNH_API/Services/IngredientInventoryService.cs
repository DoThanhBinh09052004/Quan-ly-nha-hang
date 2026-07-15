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
                        Available = ingredient.StockQuantity
                    };
                })
                .Where(row => row.Available + QuantityTolerance < row.Required)
                .ToList();

            if (shortages.Count > 0)
            {
                throw new IngredientInventoryException("Không đủ nguyên liệu để lưu đơn hàng", shortages);
            }

            foreach (var pair in requiredByIngredient)
            {
                var ingredient = recipes.First(r => r.IngredientId == pair.Key).Ingredient!;
                ingredient.StockQuantity -= pair.Value;
                ingredient.Updated = DateTime.Now;
            }

            var orderItemIds = validReservations.Select(r => r.OrderItem.Id).Distinct().ToList();
            var ingredientIds = requiredByIngredient.Keys.ToList();
            var existingAllocations = await _context.OrderItemIngredientAllocation
                .Where(a => orderItemIds.Contains(a.OrderItemId) && ingredientIds.Contains(a.IngredientId))
                .ToListAsync();

            foreach (var reservation in validReservations)
            {
                if (!recipesByItem.TryGetValue(reservation.OrderItem.ItemId!.Value, out var itemRecipes))
                    continue;

                foreach (var recipe in itemRecipes)
                {
                    var quantity = recipe.QuantityNeeded * reservation.Quantity;
                    var allocation = existingAllocations.FirstOrDefault(a =>
                        a.OrderItemId == reservation.OrderItem.Id && a.IngredientId == recipe.IngredientId);

                    if (allocation == null)
                    {
                        allocation = new OrderItemIngredientAllocation
                        {
                            OrderItemId = reservation.OrderItem.Id,
                            IngredientId = recipe.IngredientId,
                            ReservedQuantity = quantity,
                            Created = DateTime.Now,
                            Updated = DateTime.Now
                        };
                        existingAllocations.Add(allocation);
                        _context.OrderItemIngredientAllocation.Add(allocation);
                    }
                    else
                    {
                        allocation.ReservedQuantity += quantity;
                        allocation.Updated = DateTime.Now;
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
            var allocations = await GetAllocationsWithIngredientsAsync(orderItem.Id);

            foreach (var allocation in allocations)
            {
                var returned = allocation.ReservedQuantity * releaseRatio;
                if (returned <= QuantityTolerance)
                    continue;

                allocation.ReservedQuantity -= returned;
                allocation.ReturnedQuantity += returned;
                allocation.Updated = DateTime.Now;
                allocation.Ingredient!.StockQuantity += returned;
                allocation.Ingredient.Updated = DateTime.Now;
            }
        }

        public async Task ReleaseAllReservedAsync(OrderItem orderItem)
        {
            var allocations = await GetAllocationsWithIngredientsAsync(orderItem.Id);

            foreach (var allocation in allocations)
            {
                var returned = allocation.ReservedQuantity;
                if (returned <= QuantityTolerance)
                    continue;

                allocation.ReservedQuantity = 0;
                allocation.ReturnedQuantity += returned;
                allocation.Updated = DateTime.Now;
                allocation.Ingredient!.StockQuantity += returned;
                allocation.Ingredient.Updated = DateTime.Now;
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

        private async Task<List<OrderItemIngredientAllocation>> GetAllocationsWithIngredientsAsync(int orderItemId)
        {
            return await _context.OrderItemIngredientAllocation
                .Include(a => a.Ingredient)
                .Where(a => a.OrderItemId == orderItemId)
                .ToListAsync();
        }
    }
}
