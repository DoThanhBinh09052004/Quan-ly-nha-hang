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
                    Created = DateTime.Now,
                    Updated = DateTime.Now,
                    Deleted = false,
                    Voided = false
                };

                _context.OrderItem.Add(orderItem);
                await _context.SaveChangesAsync();

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
                return NoContent();
            }
            catch (Exception ex)
            {
                return StatusCode(500, "Internal server error");
            }
        }

        // Xóa tất cả OrderItems theo OrderId
        [HttpDelete("order/{orderId}")]
        [Authorize(Roles = "Manager")]

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
                }

                _context.OrderItem.AddRange(orderItems);
                await _context.SaveChangesAsync();

                return CreatedAtAction(nameof(GetOrderItems), orderItems);
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Internal server error: {ex.Message}");
            }
        }
    }
}