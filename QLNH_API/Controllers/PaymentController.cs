using System.Globalization;
using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using QLNH_API.Data;
using QLNH_API.Model;
using QLNH_API.Services;

namespace QLNH_API.Controllers
{
    [ApiController]
    [Route("payments")]
    public class PaymentController : ControllerBase
    {
        private const string PendingStatus = "PENDING";
        private const string ConfirmedStatus = "CONFIRMED";
        private const string ExpiredStatus = "EXPIRED";

        private readonly ApplicationDbcontext _context;
        private readonly IConfiguration _configuration;
        private readonly StatusResolver _statusResolver;
        private readonly ReservationService _reservationService;

        public PaymentController(ApplicationDbcontext context, IConfiguration configuration, StatusResolver statusResolver, ReservationService reservationService)
        {
            _context = context;
            _configuration = configuration;
            _statusResolver = statusResolver;
            _reservationService = reservationService;
        }

        public class CreateVietQRRequest
        {
            public int OrderId { get; set; }
        }

        public class ConfirmVietQRRequest
        {
            public long PaymentId { get; set; }
        }

        public class SepayWebhookRequest
        {
            [JsonPropertyName("id")]
            public long Id { get; set; }

            [JsonPropertyName("gateway")]
            public string? Gateway { get; set; }

            [JsonPropertyName("transactionDate")]
            public string? TransactionDate { get; set; }

            [JsonPropertyName("accountNumber")]
            public string? AccountNumber { get; set; }

            [JsonPropertyName("code")]
            public string? Code { get; set; }

            [JsonPropertyName("content")]
            public string? Content { get; set; }

            [JsonPropertyName("description")]
            public string? Description { get; set; }

            [JsonPropertyName("transferType")]
            public string? TransferType { get; set; }

            [JsonPropertyName("transferAmount")]
            public decimal TransferAmount { get; set; }

            [JsonPropertyName("referenceCode")]
            public string? ReferenceCode { get; set; }
        }

        [HttpPost("vietqr/create")]
        [Authorize(Roles = "Manager, Cashier")]
        public async Task<IActionResult> CreateVietQR([FromBody] CreateVietQRRequest request)
        {
            try
            {
                await ExpireOldPendingPaymentsAsync();

                var order = await _context.Order.FindAsync(request.OrderId);
                if (order == null)
                {
                    return NotFound("Khong tim thay don hang");
                }

                var amount = NormalizeVndAmount(order.FinalPrice - order.PaidAmount);
                if (amount <= 0)
                {
                    return BadRequest("Don hang nay da duoc thanh toan du");
                }

                var accountNo = GetRequiredSepayConfig("AccountNo");
                var accountName = GetRequiredSepayConfig("AccountName");
                var bankCode = GetRequiredSepayConfig("BankCode");
                var timeoutMinutes = GetPaymentTimeoutMinutes();
                var now = DateTime.Now;
                var addInfo = $"QLNH-{order.Id}-{now:yyyyMMddHHmmss}";
                var qrText = BuildSepayQrUrl(bankCode, accountNo, amount, addInfo);

                var payment = new Payment
                {
                    OrderId = order.Id,
                    Provider = "SEPAY",
                    Amount = amount,
                    Status = PendingStatus,
                    BankCode = bankCode,
                    AccountNo = accountNo,
                    AccountName = accountName,
                    AddInfo = addInfo,
                    QrText = qrText,
                    ExpiresAt = now.AddMinutes(timeoutMinutes),
                    Created = now,
                    Updated = now
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
                    AddInfo = payment.AddInfo,
                    ExpiresAt = payment.ExpiresAt
                });
            }
            catch (InvalidOperationException ex)
            {
                return StatusCode(500, ex.Message);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error creating payment: {ex.Message}");
                return StatusCode(500, "Internal server error.");
            }
        }

        [HttpPost("sepay/webhook")]
        [AllowAnonymous]
        public async Task<IActionResult> SepayWebhook([FromBody] SepayWebhookRequest request)
        {
            try
            {
                if (!IsValidSepayApiKey())
                {
                    return Unauthorized(new { success = false, message = "Invalid API key" });
                }

                var rawWebhookJson = JsonSerializer.Serialize(request);
                var transactionId = request.Id.ToString(CultureInfo.InvariantCulture);

                if (await _context.Payment.AnyAsync(p => p.TransactionId == transactionId))
                {
                    return Ok(new { success = true, message = "Duplicate transaction ignored" });
                }

                if (!string.Equals(request.TransferType, "in", StringComparison.OrdinalIgnoreCase))
                {
                    return Ok(new { success = true, message = "Only incoming transfers are processed" });
                }

                await ExpireOldPendingPaymentsAsync();

                var payment = await FindPaymentFromWebhookAsync(request);
                if (payment == null)
                {
                    return NotFound(new { success = false, message = "Payment code not found" });
                }

                payment.RawWebhookJson = rawWebhookJson;
                payment.ReferenceCode = request.ReferenceCode;

                if (payment.Status == ExpiredStatus || payment.ExpiresAt < DateTime.Now)
                {
                    payment.Status = ExpiredStatus;
                    payment.Updated = DateTime.Now;
                    await _context.SaveChangesAsync();
                    return BadRequest(new { success = false, message = "Payment expired" });
                }

                if (payment.Status != PendingStatus)
                {
                    await _context.SaveChangesAsync();
                    return Ok(new { success = true, message = "Payment is already processed" });
                }

                var transferAmount = NormalizeVndAmount(request.TransferAmount);
                if (transferAmount != NormalizeVndAmount(payment.Amount))
                {
                    await _context.SaveChangesAsync();
                    return BadRequest(new { success = false, message = "Transfer amount does not match payment amount" });
                }

                await ConfirmPaymentInternalAsync(payment, transactionId, request.ReferenceCode, rawWebhookJson);

                return Ok(new { success = true });
            }
            catch (DbUpdateException ex)
            {
                Console.WriteLine($"Error saving Sepay webhook: {ex.Message}");
                return Ok(new { success = true, message = "Duplicate transaction ignored" });
            }
            catch (InvalidOperationException ex)
            {
                Console.WriteLine($"Invalid Sepay webhook: {ex.Message}");
                return BadRequest(new { success = false, message = ex.Message });
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error processing Sepay webhook: {ex.Message}");
                return StatusCode(500, new { success = false, message = "Internal server error" });
            }
        }

        [HttpPost("vietqr/confirm")]
        [Authorize(Roles = "Manager, Cashier")]
        public async Task<IActionResult> ConfirmVietQR([FromBody] ConfirmVietQRRequest request)
        {
            try
            {
                await ExpireOldPendingPaymentsAsync();

                var payment = await GetPaymentWithOrderAsync(request.PaymentId);
                if (payment == null)
                {
                    return NotFound("Khong tim thay giao dich thanh toan");
                }

                if (payment.Status == ExpiredStatus || payment.ExpiresAt < DateTime.Now)
                {
                    payment.Status = ExpiredStatus;
                    payment.Updated = DateTime.Now;
                    await _context.SaveChangesAsync();
                    return BadRequest("Giao dich thanh toan da het han");
                }

                if (payment.Status != PendingStatus)
                {
                    return BadRequest("Giao dich thanh toan khong o trang thai PENDING");
                }

                await ConfirmPaymentInternalAsync(payment);

                return Ok(new
                {
                    Message = "Xac nhan thanh toan thanh cong",
                    PaymentId = payment.Id,
                    OrderStatus = payment.Order?.StatusId,
                    PaidAmount = payment.Order?.PaidAmount
                });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(ex.Message);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error confirming payment: {ex.Message}");
                return StatusCode(500, "Internal server error.");
            }
        }

        [HttpGet("{id}")]
        [Authorize(Roles = "Manager, Cashier")]
        public async Task<IActionResult> GetPayment(long id)
        {
            try
            {
                var payment = await _context.Payment
                    .Include(p => p.Order)
                    .FirstOrDefaultAsync(p => p.Id == id);

                if (payment == null)
                {
                    return NotFound("Khong tim thay giao dich thanh toan");
                }

                return Ok(new
                {
                    PaymentId = payment.Id,
                    Status = payment.Status,
                    OrderId = payment.OrderId,
                    OrderStatus = payment.Order?.StatusId,
                    PaidAmount = payment.Order?.PaidAmount,
                    ExpiresAt = payment.ExpiresAt
                });
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error getting payment status: {ex.Message}");
                return StatusCode(500, "Internal server error.");
            }
        }

        private async Task<Payment?> FindPaymentFromWebhookAsync(SepayWebhookRequest request)
        {
            var code = request.Code?.Trim();
            var content = request.Content ?? string.Empty;
            var description = request.Description ?? string.Empty;
            var webhookText = $"{code} {content} {description}";

            var exactMatch = await _context.Payment
                .Include(p => p.Order)
                    .ThenInclude(o => o.OrderItems)
                .Include(p => p.Order)
                    .ThenInclude(o => o.GuestTable)
                .Include(p => p.Order)
                    .ThenInclude(o => o.Guest)
                .Where(p => p.Provider == "SEPAY")
                .FirstOrDefaultAsync(p =>
                    (!string.IsNullOrEmpty(code) && p.AddInfo == code) ||
                    content.Contains(p.AddInfo) ||
                    description.Contains(p.AddInfo));

            if (exactMatch != null)
            {
                return exactMatch;
            }

            var normalizedWebhookText = NormalizePaymentCode(webhookText);
            if (string.IsNullOrEmpty(normalizedWebhookText))
            {
                return null;
            }

            var payments = await _context.Payment
                .Include(p => p.Order)
                    .ThenInclude(o => o.OrderItems)
                .Include(p => p.Order)
                    .ThenInclude(o => o.GuestTable)
                .Include(p => p.Order)
                    .ThenInclude(o => o.Guest)
                .Where(p => p.Provider == "SEPAY")
                .ToListAsync();

            return payments.FirstOrDefault(p =>
                !string.IsNullOrWhiteSpace(p.AddInfo) &&
                normalizedWebhookText.Contains(NormalizePaymentCode(p.AddInfo)));
        }

        private async Task<Payment?> GetPaymentWithOrderAsync(long paymentId)
        {
            return await _context.Payment
                .Include(p => p.Order)
                    .ThenInclude(o => o.OrderItems)
                .Include(p => p.Order)
                    .ThenInclude(o => o.GuestTable)
                .Include(p => p.Order)
                    .ThenInclude(o => o.Guest)
                .FirstOrDefaultAsync(p => p.Id == paymentId);
        }

        private async Task ConfirmPaymentInternalAsync(
            Payment payment,
            string? transactionId = null,
            string? referenceCode = null,
            string? rawWebhookJson = null)
        {
            var now = DateTime.Now;
            payment.Status = ConfirmedStatus;
            payment.TransactionId = transactionId;
            payment.ReferenceCode = referenceCode ?? payment.ReferenceCode;
            payment.RawWebhookJson = rawWebhookJson ?? payment.RawWebhookJson;
            payment.ConfirmedAt = now;
            payment.Updated = now;

            var order = payment.Order;
            if (order != null)
            {
                var remainingAmount = order.FinalPrice - order.PaidAmount;
                var expectedPaymentAmount = NormalizeVndAmount(remainingAmount);
                if (expectedPaymentAmount != NormalizeVndAmount(payment.Amount))
                {
                    throw new InvalidOperationException("Payment amount no longer matches the order remaining amount.");
                }

                order.PaidAmount = order.FinalPrice;
                order.ChangeAmount = 0;
                order.StatusId = await _statusResolver.GetIdAsync(StatusResolver.OrderPaid);
                order.CheckOutTime = now;
                order.Updated = now;

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
                                item.Updated = now;
                            }
                        }
                    }
                }

                if (order.GuestId.HasValue && order.Guest != null)
                {
                    var pointsEarned = (int)(order.FinalPrice / 10000m);
                    if (pointsEarned < 1 && order.FinalPrice > 0)
                    {
                        pointsEarned = 1;
                    }

                    order.Guest.Points += pointsEarned;
                    order.Guest.Updated = now;
                }

            }

            await _context.SaveChangesAsync();
            if (order?.GuestTableId is int guestTableId)
            {
                await _reservationService.RefreshTableStatusAsync(guestTableId);
            }
        }

        private async Task ExpireOldPendingPaymentsAsync()
        {
            var now = DateTime.Now;
            var expiredPayments = await _context.Payment
                .Where(p => p.Status == PendingStatus && p.ExpiresAt != null && p.ExpiresAt <= now)
                .ToListAsync();

            if (!expiredPayments.Any())
            {
                return;
            }

            foreach (var payment in expiredPayments)
            {
                payment.Status = ExpiredStatus;
                payment.Updated = now;
            }

            await _context.SaveChangesAsync();
        }

        private string BuildSepayQrUrl(string bankCode, string accountNo, decimal amount, string addInfo)
        {
            var amountText = NormalizeVndAmount(amount).ToString("0", CultureInfo.InvariantCulture);
            var encodedAddInfo = Uri.EscapeDataString(addInfo);
            return $"https://qr.sepay.vn/img?acc={accountNo}&bank={bankCode}&amount={amountText}&des={encodedAddInfo}&template=compact";
        }

        private static decimal NormalizeVndAmount(decimal amount)
        {
            return decimal.Round(amount, 0, MidpointRounding.AwayFromZero);
        }

        private static string NormalizePaymentCode(string value)
        {
            return new string(value
                .Where(char.IsLetterOrDigit)
                .Select(char.ToUpperInvariant)
                .ToArray());
        }

        private bool IsValidSepayApiKey()
        {
            var configuredApiKey = _configuration["Sepay:ApiKey"];
            if (string.IsNullOrWhiteSpace(configuredApiKey))
            {
                return false;
            }

            var authorization = Request.Headers.Authorization.ToString();
            var apiKey = Request.Headers["X-Api-Key"].ToString();

            return string.Equals(authorization, $"Apikey {configuredApiKey}", StringComparison.Ordinal) ||
                   string.Equals(authorization, $"ApiKey {configuredApiKey}", StringComparison.Ordinal) ||
                   string.Equals(apiKey, configuredApiKey, StringComparison.Ordinal);
        }

        private string GetRequiredSepayConfig(string key)
        {
            var value = _configuration[$"Sepay:{key}"];
            if (string.IsNullOrWhiteSpace(value))
            {
                throw new InvalidOperationException($"Missing Sepay:{key} configuration.");
            }

            return value;
        }

        private int GetPaymentTimeoutMinutes()
        {
            var timeout = _configuration.GetValue<int?>("Sepay:PaymentTimeoutMinutes");
            return timeout.GetValueOrDefault(15);
        }
    }
}
