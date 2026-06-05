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
    [Route("payments")]
    public class PaymentController : ControllerBase
    {
        private readonly ApplicationDbcontext _context;
        private readonly IMapper _mapper;

        public PaymentController(ApplicationDbcontext context, IMapper mapper)
        {
            _context = context;
            _mapper = mapper;
        }

        public class CreateVietQRRequest
        {
            public int OrderId { get; set; }
        }

        [HttpPost("vietqr/create")]
        [Authorize(Roles = "Manager, Cashier")]
        public async Task<IActionResult> CreateVietQR([FromBody] CreateVietQRRequest request)
        {
            try
            {
                var order = await _context.Order.FindAsync(request.OrderId);
                if (order == null)
                {
                    return NotFound("Không tìm thấy đơn hàng");
                }

                double amount = order.FinalPrice - order.PaidAmount;
                if (amount <= 0)
                {
                    return BadRequest("Đơn hàng này đã được thanh toán đủ");
                }

                string addInfo = "Chuyen khoan" + order.Id;
                string accountNo = "1042555989"; // Replace with real account number
                string accountName = "DO THANH BINH"; // Replace with real account name
                string bankCode = "VCB";

                // Generate QR string (Can be VietQR string format or URL to img.vietqr.io)
                string qrText = $"https://img.vietqr.io/image/{bankCode}-{accountNo}-compact2.png?amount={amount}&addInfo={addInfo}&accountName={accountName}";

                var payment = new Payment
                {
                    OrderId = order.Id,
                    Provider = "VIETQR",
                    Amount = amount,
                    Status = "PENDING",
                    BankCode = bankCode,
                    AccountNo = accountNo,
                    AccountName = accountName,
                    AddInfo = addInfo,
                    QrText = qrText,
                    Created = DateTime.Now,
                    Updated = DateTime.Now
                };

                _context.Payment.Add(payment);
                await _context.SaveChangesAsync();

                return Ok(new
                {
                    PaymentId = payment.Id,
                    QrText = payment.QrText,
                    Amount = payment.Amount,
                    BankCode = payment.BankCode,
                    AccountNo = payment.AccountNo,
                    AccountName = payment.AccountName,
                    AddInfo = payment.AddInfo
                });
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error creating payment: {ex.Message}");
                return StatusCode(500, "Internal server error.");
            }
        }

        public class ConfirmVietQRRequest
        {
            public long PaymentId { get; set; }
        }

        [HttpPost("vietqr/confirm")]
        [Authorize(Roles = "Manager, Cashier")]
        public async Task<IActionResult> ConfirmVietQR([FromBody] ConfirmVietQRRequest request)
        {
            try
            {
                var payment = await _context.Payment
                    .Include(p => p.Order)
                        .ThenInclude(o => o.OrderItems) // In case we need to update stock
                    .Include(p => p.Order.GuestTable)
                    .Include(p => p.Order.Guest)
                    .FirstOrDefaultAsync(p => p.Id == request.PaymentId);

                if (payment == null)
                {
                    return NotFound("Không tìm thấy giao dịch thanh toán");
                }

                if (payment.Status != "PENDING")
                {
                    return BadRequest("Giao dịch thanh toán không ở trạng thái PENDING");
                }

                payment.Status = "CONFIRMED";
                payment.Updated = DateTime.Now;

                var order = payment.Order;
                if (order != null)
                {
                    order.PaidAmount += payment.Amount;
                    order.Updated = DateTime.Now;

                    if (order.PaidAmount >= order.FinalPrice)
                    {
                        if (order.PaidAmount > order.FinalPrice)
                        {
                            order.ChangeAmount = order.PaidAmount - order.FinalPrice;
                        }

                        order.StatusId = 3; // 3 = Đã thanh toán
                        order.CheckOutTime = DateTime.Now;

                        // Cập nhật tồn kho
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
                                    }
                                }
                            }
                        }

                        // Tích điểm cho khách hàng
                        if (order.GuestId.HasValue && order.Guest != null)
                        {
                            int pointsEarned = (int)(order.FinalPrice / 10000);
                            if (pointsEarned < 1 && order.FinalPrice > 0) pointsEarned = 1;
                            order.Guest.Points += pointsEarned;
                            order.Guest.Updated = DateTime.Now;
                        }

                        // Giải phóng bàn
                        if (order.GuestTable != null)
                        {
                            order.GuestTable.StatusId = 1; // 1 = Bàn trống
                            order.GuestTable.Updated = DateTime.Now;
                        }
                    }
                }

                await _context.SaveChangesAsync();

                return Ok(new
                {
                    Message = "Xác nhận thanh toán thành công",
                    PaymentId = payment.Id,
                    OrderStatus = order?.StatusId,
                    PaidAmount = order?.PaidAmount
                });
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error confirming payment: {ex.Message}");
                return StatusCode(500, "Internal server error.");
            }
        }
    }
}
