using Microsoft.AspNetCore.Authorization;
using AutoMapper;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using QLNH_API.Data;
using QLNH_API.DTO;
using QLNH_API.Model;
using QLNH_API.Services;
using System.Data;

namespace QLNH_API.Controllers
{
    [ApiController]
    [Route("[controller]")]
    public class OrderItemController : ControllerBase
    {
        private readonly ApplicationDbcontext _context;
        private readonly StatusResolver _statusResolver;
        private readonly IngredientInventoryService _ingredientInventoryService;
        private readonly IMapper _mapper;
        private readonly OrderPointsService _orderPointsService;

        public OrderItemController(ApplicationDbcontext context, StatusResolver statusResolver, IngredientInventoryService ingredientInventoryService, IMapper mapper, OrderPointsService orderPointsService)
        {
            _context = context;
            _statusResolver = statusResolver;
            _ingredientInventoryService = ingredientInventoryService;
            _mapper = mapper;
            _orderPointsService = orderPointsService;
        }

        [HttpGet]
        [Authorize(Roles = "Manager, Service Staff")]

        public async Task<ActionResult<IEnumerable<OrderItem>>> GetOrderItems()
        {
            try
            {
                var orderItems = await _context.OrderItem
                    .Include(oi => oi.Item)
                    .Include(oi => oi.Order)
                    .Where(oi => !oi.Deleted)
                    .ToListAsync();

                return Ok(orderItems);
            }
            catch (Exception ex)
            {
                return StatusCode(500, "Internal server error");
            }
        }

        // Lấy OrderItems theo OrderId
        [HttpGet("order/{orderId}")]
        [Authorize(Roles = "Manager, Service Staff")]

        public async Task<ActionResult<IEnumerable<OrderItemDTO>>> GetOrderItemsByOrderId(int orderId)
        {
            try
            {
                var orderItems = await _context.OrderItem
                    .Include(oi => oi.Item)
                    .Include(oi => oi.CookingStatus)
                    .Where(oi => oi.OrderId == orderId && !oi.Deleted && !oi.Voided)
                    .ToListAsync();

                if (!orderItems.Any())
                {
                    return NotFound($"No order items found for order ID {orderId}");
                }

                return Ok(_mapper.Map<List<OrderItemDTO>>(orderItems));
            }
            catch (Exception ex)
            {
                return StatusCode(500, "Internal server error");
            }
        }

        // Tạo mới OrderItem
        [HttpPost]
        [Authorize(Roles = "Manager, Service Staff")]

        public async Task<ActionResult<OrderItem>> CreateOrderItem([FromBody] OrderItemDTO orderItemDto)
        {
            await using var transaction = await _context.Database.BeginTransactionAsync(IsolationLevel.Serializable);
            try
            {
                if (orderItemDto.Quantity <= 0 || !orderItemDto.ItemId.HasValue)
                {
                    return BadRequest(new { message = "Món ăn và số lượng món không hợp lệ" });
                }

                var pendingStatusId = await _statusResolver.GetIdAsync(StatusResolver.OrderItemPending);
                Console.WriteLine($"🟡 Creating order item from DTO: {System.Text.Json.JsonSerializer.Serialize(orderItemDto)}");

                // Kiểm tra Order tồn tại
                var orderExists = await _context.Order.AnyAsync(o => o.Id == orderItemDto.OrderId && !o.Deleted);
                if (!orderExists)
                {
                    return BadRequest(new { message = $"Order with ID {orderItemDto.OrderId} does not exist" });
                }

                // Tạo OrderItem từ DTO
                var orderItem = new OrderItem
                {
                    Name = orderItemDto.Name,
                    Description = orderItemDto.Description,
                    Quantity = orderItemDto.Quantity,
                    SalePrice = orderItemDto.SalePrice,
                    ItemId = orderItemDto.ItemId,
                    OrderId = orderItemDto.OrderId,
                    CookingStatusId = orderItemDto.CookingStatusId ?? pendingStatusId,
                    KitchenNote = orderItemDto.KitchenNote,
                    Created = DateTime.Now,
                    Updated = DateTime.Now,
                    Deleted = false,
                    Voided = false
                };

                _context.OrderItem.Add(orderItem);
                await _context.SaveChangesAsync();
                await _ingredientInventoryService.ReserveAsync(new[]
                {
                    new OrderItemReservation(orderItem, orderItem.Quantity)
                });
                await _context.SaveChangesAsync();
                await transaction.CommitAsync();

                try
                {
                    await RecalculateOrderActualProfitAsync(orderItem.OrderId);
                }
                catch (Exception recalculateEx)
                {
                    Console.WriteLine($"⚠️ Failed to recalculate order profit for OrderId {orderItem.OrderId}: {recalculateEx}");
                }

                Console.WriteLine($"✅ Order item created successfully with ID: {orderItem.Id}");

                return Ok(orderItem);
            }
            catch (IngredientInventoryException ex)
            {
                return BadRequest(new IngredientInventoryErrorDTO
                {
                    Message = ex.Message,
                    Shortages = ex.Shortages
                });
            }
            catch (Exception ex)
            {
                Console.WriteLine($"❌ Error creating order item: {ex.Message}");
                return StatusCode(500, new
                {
                    message = "Error creating order item",
                    error = ex.Message
                });
            }
        }

        // Cập nhật OrderItem
        [HttpPut("{id}")]
        [Authorize(Roles = "Manager, Service Staff")]

        public async Task<ActionResult<OrderItem>> UpdateOrderItem(int id, [FromBody] OrderItem orderItem)
        {
            await using var transaction = await _context.Database.BeginTransactionAsync(IsolationLevel.Serializable);
            try
            {
                if (id != orderItem.Id)
                {
                    return BadRequest("ID mismatch");
                }

                if (orderItem.Quantity <= 0)
                {
                    return BadRequest(new { message = "Số lượng món phải lớn hơn 0" });
                }

                var existingOrderItem = await _context.OrderItem
                    .FirstOrDefaultAsync(oi => oi.Id == id && !oi.Deleted);

                if (existingOrderItem == null)
                {
                    return NotFound($"OrderItem with ID {id} not found");
                }

                var pendingStatusId = await _statusResolver.GetIdAsync(StatusResolver.OrderItemPending);
                var isPending = !existingOrderItem.CookingStatusId.HasValue ||
                    existingOrderItem.CookingStatusId == pendingStatusId;

                if (!isPending && orderItem.Quantity != existingOrderItem.Quantity)
                {
                    throw new IngredientInventoryException(
                        $"Món '{existingOrderItem.Name}' đã bắt đầu chế biến nên không thể thay đổi số lượng");
                }

                if (isPending && orderItem.Quantity > existingOrderItem.Quantity)
                {
                    await _ingredientInventoryService.ReserveAsync(new[]
                    {
                        new OrderItemReservation(existingOrderItem, orderItem.Quantity - existingOrderItem.Quantity)
                    });
                }
                else if (isPending && orderItem.Quantity < existingOrderItem.Quantity)
                {
                    await _ingredientInventoryService.ReleasePendingReductionAsync(existingOrderItem, orderItem.Quantity);
                }

                // Update fields
                existingOrderItem.Name = orderItem.Name;
                existingOrderItem.Description = orderItem.Description;
                existingOrderItem.Quantity = orderItem.Quantity;
                existingOrderItem.SalePrice = orderItem.SalePrice;
                existingOrderItem.Updated = DateTime.Now;

                await _context.SaveChangesAsync();
                await RecalculateOrderActualProfitAsync(existingOrderItem.OrderId);
                await transaction.CommitAsync();
                return Ok(existingOrderItem);
            }
            catch (IngredientInventoryException ex)
            {
                return BadRequest(new IngredientInventoryErrorDTO
                {
                    Message = ex.Message,
                    Shortages = ex.Shortages
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Internal server error: {ex.Message}");
            }
        }

        // Xóa OrderItem (soft delete)
        [HttpDelete("{id}")]
        [Authorize(Roles = "Manager, Service Staff")]

        public async Task<IActionResult> DeleteOrderItem(int id)
        {
            await using var transaction = await _context.Database.BeginTransactionAsync(IsolationLevel.Serializable);
            try
            {
                var orderItem = await _context.OrderItem.FindAsync(id);
                if (orderItem == null)
                {
                    return NotFound();
                }

                await _ingredientInventoryService.ReleaseForDeletionAsync(orderItem);

                orderItem.Deleted = true;
                orderItem.Updated = DateTime.Now;

                await _context.SaveChangesAsync();
                await RecalculateOrderActualProfitAsync(orderItem.OrderId);
                await transaction.CommitAsync();
                return NoContent();
            }
            catch (Exception ex)
            {
                return StatusCode(500, "Internal server error");
            }
        }

        // Xóa tất cả OrderItems theo OrderId
        [HttpDelete("order/{orderId}")]
        [Authorize(Roles = "Manager, Service Staff")]

        public async Task<IActionResult> DeleteOrderItemsByOrderId(int orderId)
        {
            await using var transaction = await _context.Database.BeginTransactionAsync(IsolationLevel.Serializable);
            try
            {
                var orderItems = await _context.OrderItem
                    .Where(oi => oi.OrderId == orderId && !oi.Deleted)
                    .ToListAsync();

                if (!orderItems.Any())
                {
                    return NotFound($"No order items found for order ID {orderId}");
                }

                foreach (var orderItem in orderItems)
                {
                    if (!orderItem.Voided)
                    {
                        await _ingredientInventoryService.ReleaseForDeletionAsync(orderItem);
                    }
                    orderItem.Deleted = true;
                    orderItem.Updated = DateTime.Now;
                }

                await _context.SaveChangesAsync();

                try
                {
                    await RecalculateOrderActualProfitAsync(orderId);
                }
                catch (Exception recalculateEx)
                {
                    Console.WriteLine($"⚠️ Failed to recalculate order profit for OrderId {orderId}: {recalculateEx}");
                }

                await transaction.CommitAsync();

                return NoContent();
            }
            catch (Exception ex)
            {
                return StatusCode(500, "Internal server error");
            }
        }

        // Tạo nhiều OrderItems cùng lúc
        [HttpPost("bulk")]
        [Authorize(Roles = "Manager, Service Staff")]

        public async Task<ActionResult<IEnumerable<OrderItem>>> CreateOrderItems([FromBody] List<OrderItem> orderItems)
        {
            await using var transaction = await _context.Database.BeginTransactionAsync(IsolationLevel.Serializable);
            try
            {
                if (orderItems.Count == 0 || orderItems.Any(item => item.Quantity <= 0 || !item.ItemId.HasValue))
                {
                    return BadRequest(new { message = "Danh sách món không hợp lệ" });
                }

                var pendingStatusId = await _statusResolver.GetIdAsync(StatusResolver.OrderItemPending);
                var now = DateTime.Now;
                foreach (var orderItem in orderItems)
                {
                    orderItem.Created = now;
                    orderItem.Updated = now;
                    orderItem.Deleted = false;
                    orderItem.Voided = false;
                    orderItem.CookingStatusId ??= pendingStatusId;
                }

                _context.OrderItem.AddRange(orderItems);
                await _context.SaveChangesAsync();
                await _ingredientInventoryService.ReserveAsync(orderItems
                    .Select(item => new OrderItemReservation(item, item.Quantity))
                    .ToList());
                await _context.SaveChangesAsync();

                foreach (var orderId in orderItems.Select(oi => oi.OrderId).Distinct())
                {
                    try
                    {
                        await RecalculateOrderActualProfitAsync(orderId);
                    }
                    catch (Exception recalculateEx)
                    {
                        Console.WriteLine($"⚠️ Failed to recalculate order profit for OrderId {orderId}: {recalculateEx}");
                    }
                }

                await transaction.CommitAsync();

                return CreatedAtAction(nameof(GetOrderItems), orderItems);
            }
            catch (IngredientInventoryException ex)
            {
                return BadRequest(new IngredientInventoryErrorDTO
                {
                    Message = ex.Message,
                    Shortages = ex.Shortages
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Internal server error: {ex.Message}");
            }
        }

        // 1. Lấy danh sách món đang chờ & đang chế biến (cho bếp)
        [HttpGet("kitchen/pending")]
        [Authorize(Roles = "Manager, Service Staff, Kitchen")]
        public async Task<ActionResult<IEnumerable<OrderItemStatusDTO>>> GetPendingKitchenItems()
        {
            try
            {
            // Các trạng thái cần hiển thị cho bếp: Chờ chế biến và Đang chế biến
                var cookingStatusIds = await _statusResolver.GetIdsAsync(
                    StatusResolver.OrderItemPending, StatusResolver.OrderItemProcessing);
                var completedStatusId = await _statusResolver.GetIdAsync(StatusResolver.OrderItemCompleted);

                var items = await _context.OrderItem
                    .Include(oi => oi.Order)
                        .ThenInclude(o => o.GuestTable)
                    .Include(oi => oi.CookingStatus)
                    .Where(oi => !oi.Deleted && !oi.Voided
                        && cookingStatusIds.Contains(oi.CookingStatusId ?? cookingStatusIds[0])
                        && oi.CookingStatusId != completedStatusId)
                    .OrderBy(oi => oi.Created)
                    .Select(oi => new OrderItemStatusDTO
                    {
                        Id = oi.Id,
                        Name = oi.Name,
                        Quantity = oi.Quantity,
                        CookingStatusId = oi.CookingStatusId ?? cookingStatusIds[0],
                        CookingStatusCode = oi.CookingStatus != null ? oi.CookingStatus.Code : null,
                        CompletedAt = oi.CompletedAt,
                        KitchenNote = oi.KitchenNote,
                        OrderId = oi.OrderId,
                        OrderNumber = oi.Order.OrderNumber,
                        GuestTableId = oi.Order.GuestTableId,
                        TableName = oi.Order.GuestTable != null ? oi.Order.GuestTable.Name : null
                    })
                    .ToListAsync();

                return Ok(items);
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Internal server error: {ex.Message}");
            }
        }

        // 2. Bếp cập nhật trạng thái món ăn
        [HttpPut("kitchen/update-status")]
        [Authorize(Roles = "Manager, Kitchen")]
        public async Task<IActionResult> UpdateCookingStatus([FromBody] UpdateCookingStatusDTO dto)
        {
            await using var transaction = await _context.Database.BeginTransactionAsync(IsolationLevel.Serializable);
            try
            {
                var orderItem = await _context.OrderItem
                    .Include(oi => oi.CookingStatus)
                    .FirstOrDefaultAsync(oi => oi.Id == dto.OrderItemId && !oi.Deleted);

                if (orderItem == null)
                {
                    return NotFound($"Không tìm thấy món với ID {dto.OrderItemId}");
                }

                var newStatusId = dto.CookingStatusCode != null
                    ? await _statusResolver.GetIdAsync(dto.CookingStatusCode)
                    : dto.CookingStatusId;

                // Lưu trạng thái cũ để kiểm tra
                var pendingStatusId = await _statusResolver.GetIdAsync(StatusResolver.OrderItemPending);
                var completedStatusId = await _statusResolver.GetIdAsync(StatusResolver.OrderItemCompleted);
                var cancelledStatusId = await _statusResolver.GetIdAsync(StatusResolver.OrderItemCancelled);
                int oldStatusId = orderItem.CookingStatusId ?? pendingStatusId;

                await _ingredientInventoryService.HandleStatusTransitionAsync(orderItem, oldStatusId, newStatusId);

                // Cập nhật trạng thái
                orderItem.CookingStatusId = newStatusId;
                orderItem.KitchenNote = dto.KitchenNote;
                orderItem.Updated = DateTime.Now;

                // Nếu chuyển sang trạng thái "Chế biến hoàn thành", ghi nhận thời gian
                if (newStatusId == completedStatusId && oldStatusId != completedStatusId)
                {
                    orderItem.CompletedAt = DateTime.Now;
                }

                // Nếu chuyển sang "Hủy món"
                if (newStatusId == cancelledStatusId)
                {
                    orderItem.Voided = true; // Đồng bộ với flag Voided
                }

                await _context.SaveChangesAsync();
                if (newStatusId == cancelledStatusId && oldStatusId != cancelledStatusId)
                {
                    await RecalculateOrderFinancialsAsync(orderItem.OrderId);
                }

                try
                {
                    await RecalculateOrderActualProfitAsync(orderItem.OrderId);
                }
                catch (Exception profitEx)
                {
                    Console.WriteLine($"⚠️ Failed to recalculate order profit for OrderId {orderItem.OrderId}: {profitEx.Message}");
                }

                // Lấy tên trạng thái mới
                var newStatus = await _context.Status.FindAsync(newStatusId);
                await transaction.CommitAsync();

                return Ok(new
                {
                    message = "Đã cập nhật trạng thái món ăn",
                    orderItemId = orderItem.Id,
                    oldStatusId = oldStatusId,
                    newStatusId = orderItem.CookingStatusId,
                    newStatusName = newStatus?.Name,
                    completedAt = orderItem.CompletedAt
                });
            }
            catch (IngredientInventoryException ex)
            {
                return BadRequest(new IngredientInventoryErrorDTO
                {
                    Message = ex.Message,
                    Shortages = ex.Shortages
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Internal server error: {ex.Message}");
            }
        }

        // 3. Phục vụ lấy danh sách món đã hoàn thành theo order (để lên đồ)
        [HttpGet("kitchen/completed")]
        [Authorize(Roles = "Manager, Service Staff, Kitchen")]
        public async Task<ActionResult<IEnumerable<OrderItemStatusDTO>>> GetCompletedKitchenItems()
        {
            try
            {
                var completedStatusId = await _statusResolver.GetIdAsync(StatusResolver.OrderItemCompleted);
                var unpaidOrderStatusId = await _statusResolver.GetIdAsync(StatusResolver.OrderUnpaid);

                var completedItems = await _context.OrderItem
                    .AsNoTracking()
                    .Include(oi => oi.Order)
                        .ThenInclude(order => order!.GuestTable)
                    .Include(oi => oi.CookingStatus)
                    .Where(oi => !oi.Deleted
                        && !oi.Voided
                        && oi.CookingStatusId == completedStatusId
                        && oi.Order != null
                        && !oi.Order.Deleted
                        && !oi.Order.Voided
                        && oi.Order.StatusId == unpaidOrderStatusId)
                    .OrderByDescending(oi => oi.CompletedAt)
                    .ThenByDescending(oi => oi.Updated)
                    .Select(oi => new OrderItemStatusDTO
                    {
                        Id = oi.Id,
                        Name = oi.Name,
                        Quantity = oi.Quantity,
                        CookingStatusId = oi.CookingStatusId ?? completedStatusId,
                        CookingStatusCode = oi.CookingStatus != null ? oi.CookingStatus.Code : null,
                        CompletedAt = oi.CompletedAt,
                        KitchenNote = oi.KitchenNote,
                        OrderId = oi.OrderId,
                        OrderNumber = oi.Order != null ? oi.Order.OrderNumber : null,
                        GuestTableId = oi.Order != null ? oi.Order.GuestTableId : null,
                        TableName = oi.Order != null && oi.Order.GuestTable != null
                            ? oi.Order.GuestTable.Name
                            : null,
                        GuestPhone = oi.Order != null ? oi.Order.GuestPhone : null
                    })
                    .ToListAsync();

                return Ok(completedItems);
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Internal server error: {ex.Message}");
            }
        }

        [HttpGet("kitchen/completed-by-order/{orderId}")]
        [Authorize(Roles = "Manager, Service Staff, Kitchen")]
        public async Task<ActionResult<IEnumerable<OrderItemStatusDTO>>> GetCompletedItemsByOrder(int orderId)
        {
            try
            {
                var completedStatusId = await _statusResolver.GetIdAsync(StatusResolver.OrderItemCompleted);
                var completedItems = await _context.OrderItem
                    .Include(oi => oi.CookingStatus)
                    .Where(oi => oi.OrderId == orderId
                        && !oi.Deleted
                        && !oi.Voided
                        && oi.CookingStatusId == completedStatusId)
                    .Select(oi => new OrderItemStatusDTO
                    {
                        Id = oi.Id,
                        Name = oi.Name,
                        Quantity = oi.Quantity,
                        CookingStatusId = oi.CookingStatusId ?? 0,
                        CookingStatusCode = oi.CookingStatus != null ? oi.CookingStatus.Code : null,
                        CompletedAt = oi.CompletedAt,
                        KitchenNote = oi.KitchenNote,
                        OrderId = oi.OrderId
                    })
                    .ToListAsync();

                return Ok(completedItems);
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Internal server error: {ex.Message}");
            }
        }

     

        [HttpGet("kitchen/dashboard")]
        [Authorize(Roles = "Manager, Kitchen")]
        public async Task<IActionResult> GetKitchenDashboard()
        {
            try
            {
                var kitchenStatusIds = await _statusResolver.GetIdsAsync(
                    StatusResolver.OrderItemPending, StatusResolver.OrderItemProcessing,
                    StatusResolver.OrderItemCompleted, StatusResolver.OrderItemCancelled);
                var pendingCount = await _context.OrderItem
                    .CountAsync(oi => !oi.Deleted && !oi.Voided && (oi.CookingStatusId == kitchenStatusIds[0] || oi.CookingStatusId == null));

                var processingCount = await _context.OrderItem
                    .CountAsync(oi => !oi.Deleted && !oi.Voided && oi.CookingStatusId == kitchenStatusIds[1]);

                var completedCount = await _context.OrderItem
                    .CountAsync(oi => !oi.Deleted && !oi.Voided && oi.CookingStatusId == kitchenStatusIds[2]);

                var cancelledCount = await _context.OrderItem
                    .CountAsync(oi => !oi.Deleted && oi.CookingStatusId == kitchenStatusIds[3]);

                return Ok(new
                {
                    pending = pendingCount,
                    processing = processingCount,
                    completed = completedCount,
                    cancelled = cancelledCount,
                    lastUpdated = DateTime.Now
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Internal server error: {ex.Message}");
            }
        }

        private async Task RecalculateOrderActualProfitAsync(int orderId)
        {
            var order = await _context.Order
                .Include(o => o.OrderItems)
                .FirstOrDefaultAsync(o => o.Id == orderId && !o.Deleted);

            if (order == null)
                return;

            decimal actualCost = 0;

            if (order.OrderItems != null && order.OrderItems.Any())
            {
                foreach (var orderItem in order.OrderItems.Where(oi => !oi.Deleted && !oi.Voided && oi.ItemId.HasValue))
                {
                    var recipeRows = await (
                        from r in _context.Recipe
                        join i in _context.Ingredient on r.IngredientId equals i.Id
                        where r.ItemId == orderItem.ItemId.Value && !i.Deleted
                        select new
                        {
                            r.QuantityNeeded,
                            i.RawMaterialCost
                        }
                    ).ToListAsync();

                    var recipeCost = recipeRows.Sum(row => (decimal)row.QuantityNeeded * row.RawMaterialCost);

                    actualCost += recipeCost * orderItem.Quantity;
                }
            }

            order.ActualCost = actualCost;
            order.ActualProfit = order.FinalPrice - actualCost;
            order.Updated = DateTime.Now;

            await _context.SaveChangesAsync();
        }

        private async Task RecalculateOrderFinancialsAsync(int orderId)
        {
            var order = await _context.Order
                .Include(o => o.OrderItems)
                .Include(o => o.Guest)
                .FirstOrDefaultAsync(o => o.Id == orderId && !o.Deleted);

            if (order == null)
                return;

            var activeItems = order.OrderItems?
                .Where(item => !item.Deleted && !item.Voided)
                .ToList() ?? new List<OrderItem>();

            var updatedTotal = activeItems.Sum(item => (decimal)item.SalePrice * item.Quantity);

            order.TotalPrice = updatedTotal;
            _orderPointsService.RepriceAfterTotalChange(order);

            await _context.SaveChangesAsync();
        }

       
    }
}
