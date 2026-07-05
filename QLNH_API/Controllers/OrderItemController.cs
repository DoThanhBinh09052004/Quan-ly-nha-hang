using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using QLNH_API.Data;
using QLNH_API.DTO;
using QLNH_API.Model;

namespace QLNH_API.Controllers
{
    [ApiController]
    [Route("[controller]")]
    public class OrderItemController : ControllerBase
    {
        private readonly ApplicationDbcontext _context;

        public OrderItemController(ApplicationDbcontext context)
        {
            _context = context;
        }

        [HttpGet]
        [Authorize(Roles = "Manager, Cashier")]

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
        [Authorize(Roles = "Manager, Cashier")]

        public async Task<ActionResult<IEnumerable<OrderItem>>> GetOrderItemsByOrderId(int orderId)
        {
            try
            {
                var orderItems = await _context.OrderItem
                    .Include(oi => oi.Item)
                    .Where(oi => oi.OrderId == orderId && !oi.Deleted)
                    .ToListAsync();

                if (!orderItems.Any())
                {
                    return NotFound($"No order items found for order ID {orderId}");
                }

                return Ok(orderItems);
            }
            catch (Exception ex)
            {
                return StatusCode(500, "Internal server error");
            }
        }

        // Tạo mới OrderItem
        [HttpPost]
        [Authorize(Roles = "Manager, Cashier")]

        public async Task<ActionResult<OrderItem>> CreateOrderItem([FromBody] OrderItemDTO orderItemDto)
        {
            try
            {
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
                    CookingStatusId = orderItemDto.CookingStatusId ?? 9,
                    KitchenNote = orderItemDto.KitchenNote,
                    Created = DateTime.Now,
                    Updated = DateTime.Now,
                    Deleted = false,
                    Voided = false
                };

                _context.OrderItem.Add(orderItem);
                await _context.SaveChangesAsync();

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
        [Authorize(Roles = "Manager, Cashier")]

        public async Task<ActionResult<OrderItem>> UpdateOrderItem(int id, [FromBody] OrderItem orderItem)
        {
            try
            {
                if (id != orderItem.Id)
                {
                    return BadRequest("ID mismatch");
                }

                var existingOrderItem = await _context.OrderItem
                    .FirstOrDefaultAsync(oi => oi.Id == id && !oi.Deleted);

                if (existingOrderItem == null)
                {
                    return NotFound($"OrderItem with ID {id} not found");
                }

                // Update fields
                existingOrderItem.Name = orderItem.Name;
                existingOrderItem.Description = orderItem.Description;
                existingOrderItem.Quantity = orderItem.Quantity;
                existingOrderItem.SalePrice = orderItem.SalePrice;
                existingOrderItem.Updated = DateTime.Now;
                existingOrderItem.Voided = orderItem.Voided;

                await _context.SaveChangesAsync();
                await RecalculateOrderActualProfitAsync(existingOrderItem.OrderId);
                return Ok(existingOrderItem);
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Internal server error: {ex.Message}");
            }
        }

        // Xóa OrderItem (soft delete)
        [HttpDelete("{id}")]
        [Authorize(Roles = "Manager")]

        public async Task<IActionResult> DeleteOrderItem(int id)
        {
            try
            {
                var orderItem = await _context.OrderItem.FindAsync(id);
                if (orderItem == null)
                {
                    return NotFound();
                }

                orderItem.Deleted = true;
                orderItem.Updated = DateTime.Now;

                await _context.SaveChangesAsync();
                await RecalculateOrderActualProfitAsync(orderItem.OrderId);
                return NoContent();
            }
            catch (Exception ex)
            {
                return StatusCode(500, "Internal server error");
            }
        }

        // Xóa tất cả OrderItems theo OrderId
        [HttpDelete("order/{orderId}")]
        [Authorize(Roles = "Manager, Cashier")]

        public async Task<IActionResult> DeleteOrderItemsByOrderId(int orderId)
        {
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

                return NoContent();
            }
            catch (Exception ex)
            {
                return StatusCode(500, "Internal server error");
            }
        }

        // Tạo nhiều OrderItems cùng lúc
        [HttpPost("bulk")]
        [Authorize(Roles = "Manager, Cashier")]

        public async Task<ActionResult<IEnumerable<OrderItem>>> CreateOrderItems([FromBody] List<OrderItem> orderItems)
        {
            try
            {
                var now = DateTime.Now;
                foreach (var orderItem in orderItems)
                {
                    orderItem.Created = now;
                    orderItem.Updated = now;
                    orderItem.Deleted = false;
                    orderItem.Voided = false;
                    orderItem.CookingStatusId ??= 9;
                }

                _context.OrderItem.AddRange(orderItems);
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

                return CreatedAtAction(nameof(GetOrderItems), orderItems);
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Internal server error: {ex.Message}");
            }
        }

        // 1. Lấy danh sách món đang chờ & đang chế biến (cho bếp)
        [HttpGet("kitchen/pending")]
        [Authorize(Roles = "Manager, Cashier, Kitchen")]
        public async Task<ActionResult<IEnumerable<OrderItemStatusDTO>>> GetPendingKitchenItems()
        {
            try
            {
                // Các trạng thái cần hiển thị cho bếp: Chờ chế biến(9) và Đang chế biến(6)
                var cookingStatusIds = new[] { 9, 6 };

                var items = await _context.OrderItem
                    .Include(oi => oi.Order)
                        .ThenInclude(o => o.GuestTable)
                    .Include(oi => oi.CookingStatus)
                    .Where(oi => !oi.Deleted && !oi.Voided
                        && cookingStatusIds.Contains(oi.CookingStatusId ?? 9)
                        && oi.CookingStatusId != 7) // Chưa hoàn thành
                    .OrderBy(oi => oi.Created)
                    .Select(oi => new OrderItemStatusDTO
                    {
                        Id = oi.Id,
                        Name = oi.Name,
                        Quantity = oi.Quantity,
                        CookingStatusId = oi.CookingStatusId ?? 9,
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
            try
            {
                var orderItem = await _context.OrderItem
                    .Include(oi => oi.CookingStatus)
                    .FirstOrDefaultAsync(oi => oi.Id == dto.OrderItemId && !oi.Deleted);

                if (orderItem == null)
                {
                    return NotFound($"Không tìm thấy món với ID {dto.OrderItemId}");
                }

                // Lưu trạng thái cũ để kiểm tra
                int oldStatusId = orderItem.CookingStatusId ?? 9;

                // Cập nhật trạng thái
                orderItem.CookingStatusId = dto.CookingStatusId;
                orderItem.KitchenNote = dto.KitchenNote;
                orderItem.Updated = DateTime.Now;

                // Nếu chuyển sang trạng thái "Chế biến hoàn thành" (7), ghi nhận thời gian
                if (dto.CookingStatusId == 7 && oldStatusId != 7)
                {
                    orderItem.CompletedAt = DateTime.Now;
                }

                // Nếu chuyển sang "Hủy món" (8)
                if (dto.CookingStatusId == 8)
                {
                    orderItem.Voided = true; // Đồng bộ với flag Voided
                }

                await _context.SaveChangesAsync();
                try
                {
                    await RecalculateOrderActualProfitAsync(orderItem.OrderId);
                }
                catch (Exception profitEx)
                {
                    Console.WriteLine($"⚠️ Failed to recalculate order profit for OrderId {orderItem.OrderId}: {profitEx.Message}");
                }

                // Lấy tên trạng thái mới
                var newStatus = await _context.Status.FindAsync(dto.CookingStatusId);

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
            catch (Exception ex)
            {
                return StatusCode(500, $"Internal server error: {ex.Message}");
            }
        }

        // 3. Phục vụ lấy danh sách món đã hoàn thành theo order (để lên đồ)
        [HttpGet("kitchen/completed-by-order/{orderId}")]
        [Authorize(Roles = "Manager, Cashier, Kitchen")]
        public async Task<ActionResult<IEnumerable<OrderItemStatusDTO>>> GetCompletedItemsByOrder(int orderId)
        {
            try
            {
                var completedItems = await _context.OrderItem
                    .Include(oi => oi.CookingStatus)
                    .Where(oi => oi.OrderId == orderId
                        && !oi.Deleted
                        && !oi.Voided
                        && oi.CookingStatusId == 7) // Chế biến hoàn thành
                    .Select(oi => new OrderItemStatusDTO
                    {
                        Id = oi.Id,
                        Name = oi.Name,
                        Quantity = oi.Quantity,
                        CookingStatusId = oi.CookingStatusId ?? 0,
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
                var pendingCount = await _context.OrderItem
                    .CountAsync(oi => !oi.Deleted && !oi.Voided && (oi.CookingStatusId == 9 || oi.CookingStatusId == null));

                var processingCount = await _context.OrderItem
                    .CountAsync(oi => !oi.Deleted && !oi.Voided && oi.CookingStatusId == 6);

                var completedCount = await _context.OrderItem
                    .CountAsync(oi => !oi.Deleted && !oi.Voided && oi.CookingStatusId == 7);

                var cancelledCount = await _context.OrderItem
                    .CountAsync(oi => !oi.Deleted && oi.CookingStatusId == 8);

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

       
    }
}
