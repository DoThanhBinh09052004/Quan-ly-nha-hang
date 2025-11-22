using AutoMapper;
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
    public class OrderController : ControllerBase
    {
        private readonly ApplicationDbcontext _context;
        private readonly IMapper _mapper;

        public OrderController(ApplicationDbcontext context, IMapper mapper)
        {
            _context = context;
            _mapper = mapper;
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
                                          .Include(o=>o.GuestTable)
                                          .Include(o=>o.Status)
                                          .Where(o => !o.Deleted)
                                          .ToListAsync();

                if (orders == null || !orders.Any())
                {
                    return NotFound("No orders found.");
                }

                // Dùng AutoMapper thay vì trực tiếp
                var orderDTOs = _mapper.Map<IEnumerable<OrderDTO>>(orders);
                return Ok(orderDTOs);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error getting orders: {ex.Message}");
                return StatusCode(500, "Internal server error. Please try again later.");
            }
        }


        // Lấy Order theo ID
        [HttpGet("{id}")]
        [Authorize(Roles = "Manager, Cashier")]

        public async Task<ActionResult<Order>> GetOrderById(int id)
        {
            try
            {
                var order = await _context.Order
                                         .Include(o => o.OrderItems)
                                           .ThenInclude(oi => oi.Item)
                                         .Include(o => o.CreatedUser)
                                         .Include(o => o.UpdatedUser)
                                          .Include(o => o.GuestTable)
                                          .Include(o => o.Status)
                                         .FirstOrDefaultAsync(o => o.Id == id && !o.Deleted);

                if (order == null)
                {
                    return NotFound($"Order with ID {id} not found.");
                }

                return Ok(order);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error getting order: {ex.Message}");
                return StatusCode(500, "Internal server error.");
            }
        }

        // Thêm Order mới
        [HttpPost]
        [Authorize(Roles = "Manager,Cashier")]
        public async Task<ActionResult<Order>> CreateOrder(Order order)
        {
            if (order.OrderItems != null)
            {
                foreach (var item in order.OrderItems)
                {
                    item.Created = DateTime.Now;
                    item.Updated = DateTime.Now;
                }
            }

            var table = await _context.GuestTable.FindAsync(order.GuestTableId);
            if (table != null)
            {
                table.StatusId = 2; // Bàn đang phục vụ
            }

            order.Created = DateTime.Now;
            order.Updated = DateTime.Now;

            _context.Order.Add(order);
            await _context.SaveChangesAsync();

            // Nếu đã nhập paidAmount
            if (order.PaidAmount >= order.TotalPrice)
            {
                await PayOrderInternal(order); // Thanh toán tự động
            }

            return Ok(order);
        }

        //Xóa item xóa mềm 
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

                // Soft delete thay vì xóa hẳn
                order.Deleted = true;
                order.Updated = DateTime.Now;

                // Cũng soft delete các order items
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
            var existingOrder = await _context.Order
                                              .Include(o => o.GuestTable)
                                              .Include(o => o.OrderItems)
                                              .FirstOrDefaultAsync(o => o.Id == id);

            if (existingOrder == null)
                return NotFound("Order không tồn tại");

            _context.Entry(existingOrder).CurrentValues.SetValues(updatedOrder);
            existingOrder.Updated = DateTime.Now;

            await _context.SaveChangesAsync();

            // Thanh toán nếu đủ tiền
            if (updatedOrder.PaidAmount >= existingOrder.TotalPrice)
            {
                await PayOrderInternal(existingOrder);
            }

            return Ok(existingOrder);
        }

        private async Task PayOrderInternal(Order order)
        {
            // Đổi trạng thái Order
            order.StatusId = 3; // Đã thanh toán
            order.Updated = DateTime.Now;

            // Đổi trạng thái bàn
            if (order.GuestTable != null)
            {
                order.GuestTable.StatusId = 1; // Bàn trống
                order.GuestTable.Updated = DateTime.Now;
            }

            // Tính tiền thừa
            if (order.PaidAmount > order.TotalPrice)
            {
                order.ChangeAmount = order.PaidAmount - order.TotalPrice;
            }

            await _context.SaveChangesAsync();
        }



        private string GenerateOrderNumber()
        {
            return "ORD-" + DateTime.Now.ToString("yyyyMMdd-HHmmss");
        }
    }
}