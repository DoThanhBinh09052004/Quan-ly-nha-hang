using AutoMapper;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using QLNH_API.Data;
using QLNH_API.DTO;
using QLNH_API.Model;
using QLNH_API.Services;

namespace QLNH_API.Controllers
{
    [ApiController]
    [Route("[controller]")]
    public class OrderController : ControllerBase
    {
        private readonly ApplicationDbcontext _context;
        private readonly IMapper _mapper;
        private readonly AiClientService _aiService;

        public OrderController(ApplicationDbcontext context, IMapper mapper, AiClientService aiService)
        {
            _context = context;
            _mapper = mapper;
            _aiService = aiService;
        }

        [HttpGet]
        [Authorize(Roles = "Manager, Cashier")]
        public async Task<ActionResult<IEnumerable<OrderDTO>>> GetOrder()
        {
            try
            {
                var orders = await _context.Order
                    .Include(o => o.OrderItems)
                        .ThenInclude(oi => oi.Item)
                    .Include(o => o.CreatedUser)
                    .Include(o => o.UpdatedUser)
                    .Include(o => o.GuestTable)
                    .Include(o => o.Guest)
                    .Include(o => o.Status)
                    .Where(o => !o.Deleted)
                    .ToListAsync();

                if (orders == null || !orders.Any())
                {
                    return NotFound("No orders found.");
                }

                var orderDTOs = _mapper.Map<IEnumerable<OrderDTO>>(orders);
                return Ok(orderDTOs);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error getting orders: {ex.Message}");
                return StatusCode(500, "Internal server error. Please try again later.");
            }
        }

        [HttpGet("{id}")]
        [Authorize(Roles = "Manager, Cashier")]
        public async Task<ActionResult<OrderDTO>> GetOrderById(int id)
        {
            try
            {
                var order = await _context.Order
                    .Include(o => o.OrderItems)
                        .ThenInclude(oi => oi.Item)
                    .Include(o => o.CreatedUser)
                    .Include(o => o.UpdatedUser)
                    .Include(o => o.GuestTable)
                    .Include(o => o.Guest)
                    .Include(o => o.Status)
                    .FirstOrDefaultAsync(o => o.Id == id && !o.Deleted);

                if (order == null)
                {
                    return NotFound($"Order with ID {id} not found.");
                }

                var orderDTO = _mapper.Map<OrderDTO>(order);
                return Ok(orderDTO);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error getting order: {ex.Message}");
                return StatusCode(500, "Internal server error.");
            }
        }

        [HttpPost]
        [Authorize(Roles = "Manager,Cashier")]
        public async Task<ActionResult<OrderDTO>> CreateOrder(Order order)
        {
            try
            {
                // 1. Xử lý giảm giá nếu có số điện thoại khách hàng
                if (!string.IsNullOrEmpty(order.GuestPhone))
                {
                    var guest = await _context.Guest
                        .FirstOrDefaultAsync(g => g.Phone == order.GuestPhone && !g.Deleted);

                    if (guest != null)
                    {
                        // Áp dụng giảm giá 3%
                        order.Discount = order.TotalPrice * 0.03;
                        order.GuestId = guest.Id;
                    }
                }
                // THÊM: Ghi nhận số điện thoại cho dù không tìm thấy khách hàng
                else if (!string.IsNullOrEmpty(order.GuestPhone))
                {
                    // Vẫn lưu số điện thoại nhưng không có giảm giá
                    order.GuestId = null;
                    order.Discount = 0;
                }

                // 2. Tính final price - QUAN TRỌNG: finalPrice = totalPrice - discount
                order.FinalPrice = order.TotalPrice - order.Discount; 

                // 3. Xử lý order items
                if (order.OrderItems != null)
                {
                    foreach (var item in order.OrderItems)
                    {
                        item.Created = DateTime.Now;
                        item.Updated = DateTime.Now;
                    }
                }

                // 4. Cập nhật trạng thái bàn
                var table = await _context.GuestTable.FindAsync(order.GuestTableId);
                if (table != null)
                {
                    table.StatusId = 2; // Bàn đang phục vụ
                    table.Updated = DateTime.Now;
                    order.CheckInTime = DateTime.Now;
                }

                // 5. Tạo số đơn hàng
                order.OrderNumber = GenerateOrderNumber();
                order.Created = DateTime.Now;
                order.Updated = DateTime.Now;
                order.StatusId = 4; // Chưa thanh toán

                // 6. Tính tiền thừa nếu có paidAmount
                if (order.PaidAmount > 0)
                {
                    order.ChangeAmount = order.PaidAmount - order.FinalPrice;
                }

                _context.Order.Add(order);
                await _context.SaveChangesAsync();

                // 7. Thanh toán tự động nếu đã nhập paidAmount đủ
                if (order.PaidAmount >= order.FinalPrice)
                {
                    order.CheckOutTime = DateTime.Now;
                    await PayOrderInternal(order);
                }

                var orderDTO = _mapper.Map<OrderDTO>(order);
                return Ok(orderDTO);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error creating order: {ex.Message}");
                return StatusCode(500, "Internal server error.");
            }
        }

        [HttpDelete("{id}")]
        [Authorize(Roles = "Manager")]
        public async Task<IActionResult> Delete(int id)
        {
            try
            {
                var order = await _context.Order.FindAsync(id);
                if (order == null)
                {
                    return NotFound();
                }

                // Soft delete
                order.Deleted = true;
                order.Updated = DateTime.Now;

                // Soft delete order items
                var orderItems = await _context.OrderItem
                    .Where(oi => oi.OrderId == id)
                    .ToListAsync();

                foreach (var item in orderItems)
                {
                    item.Deleted = true;
                    item.Updated = DateTime.Now;
                }

                await _context.SaveChangesAsync();
                return NoContent();
            }
            catch (Exception ex)
            {
                return StatusCode(500, "Đã xảy ra lỗi khi xóa Đơn hàng");
            }
        }

        [HttpPut("{id}")]
        [Authorize(Roles = "Manager, Cashier")]
        public async Task<IActionResult> Update(int id, [FromBody] Order updatedOrder)
        {
            try
            {
                var existingOrder = await _context.Order
                    .Include(o => o.GuestTable)
                    .Include(o => o.OrderItems)
                    .Include(o => o.Guest)
                    .FirstOrDefaultAsync(o => o.Id == id);

                if (existingOrder == null)
                    return NotFound("Order không tồn tại");

                // Xử lý giảm giá nếu có thay đổi số điện thoại
                if (!string.IsNullOrEmpty(updatedOrder.GuestPhone) &&
                    updatedOrder.GuestPhone != existingOrder.GuestPhone)
                {
                    var guest = await _context.Guest
                        .FirstOrDefaultAsync(g => g.Phone == updatedOrder.GuestPhone && !g.Deleted);

                    if (guest != null)
                    {
                        // Áp dụng giảm giá 3%
                        updatedOrder.Discount = updatedOrder.TotalPrice * 0.03;
                        updatedOrder.GuestId = guest.Id;
                        existingOrder.GuestPhone = updatedOrder.GuestPhone;
                    }
                    else
                    {
                        updatedOrder.Discount = 0;
                        updatedOrder.GuestId = null;
                        existingOrder.GuestPhone = updatedOrder.GuestPhone;
                    }
                }
                else if (string.IsNullOrEmpty(updatedOrder.GuestPhone))
                {
                    updatedOrder.Discount = 0;
                    updatedOrder.GuestId = null;
                    existingOrder.GuestPhone = null;
                }

                updatedOrder.FinalPrice = updatedOrder.TotalPrice - updatedOrder.Discount;

                // Cập nhật các trường
                existingOrder.GuestId = updatedOrder.GuestId;
                existingOrder.Discount = updatedOrder.Discount;
                existingOrder.FinalPrice = updatedOrder.FinalPrice;
                existingOrder.TotalPrice = updatedOrder.TotalPrice;
                existingOrder.PaidAmount = updatedOrder.PaidAmount;
                existingOrder.Description = updatedOrder.Description;
                existingOrder.GuestTableId = updatedOrder.GuestTableId;
                existingOrder.ChangeAmount=existingOrder.PaidAmount - existingOrder.FinalPrice;
                existingOrder.Updated = DateTime.Now;

                await _context.SaveChangesAsync();

                // Thanh toán nếu đủ tiền
                if (updatedOrder.PaidAmount >= existingOrder.FinalPrice)
                {
                    existingOrder.CheckOutTime = DateTime.Now;
                    await PayOrderInternal(existingOrder);
                }

                var orderDTO = _mapper.Map<OrderDTO>(existingOrder);
                return Ok(orderDTO);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error updating order: {ex.Message}");
                return StatusCode(500, "Internal server error.");
            }
        }

        private async Task PayOrderInternal(Order order)
        {
            try
            {
                // Nếu đã thanh toán rồi thì không xử lý lại
                if (order.StatusId == 3) return;

                // Đổi trạng thái Order
                order.StatusId = 3; // Đã thanh toán
                order.Updated = DateTime.Now;

                // Cập nhật số lượng item trong kho
                if (order.OrderItems != null && order.OrderItems.Any())
                {
                    foreach (var orderItem in order.OrderItems)
                    {
                        if (orderItem.ItemId.HasValue && !orderItem.Voided && !orderItem.Deleted)
                        {
                            var item = await _context.Item.FindAsync(orderItem.ItemId.Value);
                            if (item != null)
                            {
                                item.Quantity -= orderItem.Quantity;
                                item.Updated = DateTime.Now;
                                Console.WriteLine($"Cập nhật tồn kho món {item.Name}: {item.Quantity + orderItem.Quantity} -> {item.Quantity}");
                            }
                        }
                    }
                }

                // Tích điểm khi thanh toán (chỉ tích khi thanh toán thành công)
                if (order.GuestId.HasValue)
                {
                    var guest = await _context.Guest.FindAsync(order.GuestId.Value);
                    if (guest != null)
                    {
                        // Quy tắc tích điểm: 1 điểm cho mỗi 10,000 VND (sau khi giảm giá)
                        int pointsEarned = (int)(order.FinalPrice / 10000);

                        // Tối thiểu 1 điểm cho đơn hàng > 0
                        if (pointsEarned < 1 && order.FinalPrice > 0)
                        {
                            pointsEarned = 1;
                        }

                        // Cộng điểm cho khách hàng
                        guest.Points += pointsEarned;
                        guest.Updated = DateTime.Now;

                        Console.WriteLine($"Tích {pointsEarned} điểm cho khách hàng {guest.Name} (ID: {guest.Id}). Tổng điểm hiện tại: {guest.Points}");
                    }
                }

                // Đổi trạng thái bàn
                if (order.GuestTable != null)
                {
                    order.GuestTable.StatusId = 1; // Bàn trống
                    order.GuestTable.Updated = DateTime.Now;
                }

                // Tính tiền thừa
                if (order.PaidAmount > order.FinalPrice)
                {
                    order.ChangeAmount = order.PaidAmount - order.FinalPrice;
                }

                await _context.SaveChangesAsync();
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error in PayOrderInternal: {ex.Message}");
                throw; // Re-throw để controller có thể xử lý
            }
        }

        private string GenerateOrderNumber()
        {
            return "ORD-" + DateTime.Now.ToString("yyyyMMdd-HHmmss");
        }

        [HttpPost("ai-recommendations")]
        [Authorize(Roles = "Manager, Cashier")]
        public async Task<IActionResult> GetAiRecommendations([FromBody] AiRecommendationsRequest request, CancellationToken cancellationToken)
        {
            var items = request?.CurrentItems ?? new List<string>();
            var topN = request?.TopN ?? 5;

            if (items.Count == 0)
                return Ok(new List<AiRecommendationItemDto>());

            try
            {
                var result = await _aiService.RecommendForTableAsync(items, topN, cancellationToken);
                return Ok(result);
            }
            catch (HttpRequestException)
            {
                var fallback = await GetFallbackTopSellingAsync(topN, cancellationToken);
                return Ok(fallback);
            }
            catch
            {
                var fallback = await GetFallbackTopSellingAsync(topN, cancellationToken);
                return Ok(fallback);
            }
        }

        [HttpPost("ai-market-basket")]
        [Authorize(Roles = "Manager, Cashier")]
        public async Task<IActionResult> AnalyzeMarketBasket([FromBody] AiMarketBasketRequest request, CancellationToken cancellationToken)
        {
            var items = request?.Items ?? new List<string>();
            var topN = request?.TopN ?? 5;

            if (items.Count == 0)
                return Ok(new List<AiRecommendationItemDto>());

            try
            {
                var result = await _aiService.AnalyzeMarketBasketAsync(items, topN, cancellationToken);
                return Ok(result);
            }
            catch (HttpRequestException)
            {
                var fallback = await GetFallbackTopSellingAsync(topN, cancellationToken);
                return Ok(fallback);
            }
            catch
            {
                var fallback = await GetFallbackTopSellingAsync(topN, cancellationToken);
                return Ok(fallback);
            }
        }

        private async Task<List<AiRecommendationItemDto>> GetFallbackTopSellingAsync(int topN, CancellationToken cancellationToken)
        {
            var rows = await _context.OrderItem
                .Where(oi => !oi.Deleted && !oi.Voided)
                .GroupBy(oi => oi.Name)
                .Select(g => new { Name = g.Key, TotalQuantity = g.Sum(x => x.Quantity) })
                .OrderByDescending(x => x.TotalQuantity)
                .Take(topN)
                .ToListAsync(cancellationToken);

            return rows
                .Where(x => !string.IsNullOrWhiteSpace(x.Name))
                .Select(x => new AiRecommendationItemDto
                {
                    Item = x.Name ?? "",
                    Confidence = 0.5,
                    Lift = 1.0
                })
                .ToList();
        }

        public sealed class AiRecommendationsRequest
        {
            public List<string> CurrentItems { get; set; } = new();
            public int TopN { get; set; } = 5;
        }

        public sealed class AiMarketBasketRequest
        {
            public List<string> Items { get; set; } = new();
            public int TopN { get; set; } = 5;
        }


        [HttpPost("{id}/use-points")]
        [Authorize(Roles = "Manager, Cashier")]
        public async Task<ActionResult<OrderDTO>> UsePoints(int id, [FromBody] UsePointsRequest request)
        {
            try
            {
                var order = await _context.Order
                    .Include(o => o.Guest)
                    .FirstOrDefaultAsync(o => o.Id == id && !o.Deleted);

                if (order == null)
                    return NotFound("Order không tồn tại");

                if (order.GuestId == null || order.Guest == null)
                    return BadRequest("Order không có khách hàng");

                // Kiểm tra điểm tối thiểu và bội số của 50
                if (request.PointsToUse < 50)
                    return BadRequest($"Số điểm tối thiểu để đổi là 50 điểm");

                if (request.PointsToUse % 50 != 0)
                    return BadRequest($"Số điểm phải là bội số của 50");

                // Kiểm tra điểm khách hàng
                if (order.Guest.Points < request.PointsToUse)
                    return BadRequest($"Khách hàng chỉ có {order.Guest.Points} điểm");

                // Tính giá trị giảm giá theo tỷ lệ mới: 50 điểm = 25,000 VND (1 điểm = 500 VND)
                double discountValue = request.PointsToUse * 500;

             
                double currentDiscount = order.Discount;
                double maxDiscount = order.FinalPrice; 

                // Debug log để kiểm tra
                Console.WriteLine($"DEBUG - TotalPrice: {order.TotalPrice}, Discount: {order.Discount}, FinalPrice: {order.FinalPrice}");
                Console.WriteLine($"DEBUG - Max discount allowed: {maxDiscount}");

                if (discountValue > maxDiscount)
                {
                    // Tính số điểm tối đa có thể dùng (làm tròn xuống bội số của 50)
                    int maxPoints = (int)(maxDiscount / 500);
                    maxPoints = (maxPoints / 50) * 50; // Làm tròn xuống bội số của 50

                    Console.WriteLine($"DEBUG - Max points calculated: {maxPoints}");

                    if (maxPoints < 50)
                        return BadRequest("Không thể dùng điểm vì giá trị đơn hàng còn lại quá thấp");

                    request.PointsToUse = maxPoints;
                    discountValue = request.PointsToUse * 500;
                }

                // Cập nhật giảm giá và điểm
                order.Discount += discountValue;
                order.FinalPrice = order.TotalPrice - order.Discount; // FinalPrice được tính lại sau khi cộng thêm discount
                order.Guest.Points -= request.PointsToUse;
                order.Updated = DateTime.Now;

                await _context.SaveChangesAsync();

                var orderDTO = _mapper.Map<OrderDTO>(order);
                return Ok(new
                {
                    Message = $"Đã dùng {request.PointsToUse} điểm để giảm {discountValue:N0} VND",
                    Order = orderDTO,
                    RemainingPoints = order.Guest.Points,
                    NewFinalPrice = order.FinalPrice // Thêm để frontend dễ theo dõi
                });
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error using points: {ex.Message}");
                return StatusCode(500, "Internal server error.");
            }
        }

        public class UsePointsRequest
        {
            public int PointsToUse { get; set; }
        }
    }
}
