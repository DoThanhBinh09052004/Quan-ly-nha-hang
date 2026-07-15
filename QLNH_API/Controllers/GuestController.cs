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
    public class GuestController : ControllerBase
    {
        private readonly ApplicationDbcontext _context;
        private readonly AiClientService _aiService;
        private readonly CustomerSegmentDataService _customerSegmentData;

        public GuestController(ApplicationDbcontext context, AiClientService aiService, CustomerSegmentDataService customerSegmentData)
        {
            _context = context;
            _aiService = aiService;
            _customerSegmentData = customerSegmentData;
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<GuestDTO>>> GetGuests()
        {
            var guests = await _context.Guest
                .Where(g => !g.Deleted)
                .ToListAsync();

            return Ok(guests);
        }

        [HttpGet("search")]
        public async Task<ActionResult<GuestDTO>> SearchGuestByPhone(string phone)
        {
            try
            {
                var guest = await _context.Guest
                    .FirstOrDefaultAsync(g => g.Phone == phone && !g.Deleted);

                if (guest == null)
                {
                    return NotFound("Khách hàng không tồn tại");
                }

                var guestDTO = new GuestDTO
                {
                    Id = guest.Id,
                    Name = guest.Name,
                    Phone = guest.Phone,
                    Points = guest.Points
                };

                return Ok(guestDTO);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error searching guest: {ex.Message}");
                return StatusCode(500, "Internal server error.");
            }
        }

        [HttpPost]
        public async Task<ActionResult<Guest>> CreateGuest([FromBody] Guest guest)
        {
            try
            {
                guest.Created = DateTime.Now;
                guest.Updated = DateTime.Now;
                guest.Deleted = false;

                _context.Guest.Add(guest);
                await _context.SaveChangesAsync();

                return CreatedAtAction(nameof(SearchGuestByPhone), new { phone = guest.Phone }, guest);
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Lỗi khi tạo khách hàng: {ex.Message}");
            }
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateGuest(int id, [FromBody] Guest guestData)
        {
            var guest = await _context.Guest.FindAsync(id);
            if (guest == null || guest.Deleted) return NotFound("Không tìm thấy khách hàng");

            // Cập nhật các thông tin (Partial Update)
            if (!string.IsNullOrEmpty(guestData.Name)) guest.Name = guestData.Name;
            if (!string.IsNullOrEmpty(guestData.Phone)) guest.Phone = guestData.Phone;

            guest.Points = guestData.Points;
            guest.Updated = DateTime.Now;

            await _context.SaveChangesAsync();
            return Ok(guest);
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteGuest(int id)
        {
            var guest = await _context.Guest.FindAsync(id);
            if (guest == null) return NotFound();

            // Thực hiện Soft Delete để không mất dữ liệu liên kết đơn hàng
            guest.Deleted = true;
            guest.Updated = DateTime.Now;

            await _context.SaveChangesAsync();
            return NoContent(); // Trả về 204 đúng chuẩn Delete thành công
        }

        [HttpGet("{id}/ai-segment")]
        public async Task<IActionResult> GetCustomerSegment(int id, CancellationToken cancellationToken)
        {
            try
            {
                var payload = await _customerSegmentData.GetPayloadAsync(id, cancellationToken);
                if (payload == null)
                    return NotFound("Khong tim thay khach hang");

                var result = await _aiService.GetCustomerSegmentAsync(payload, cancellationToken);
                return Ok(result);
            }
            catch (HttpRequestException)
            {
                return Ok(new AiCustomerSegmentResponseDto
                {
                    GuestId = id,
                    Cluster = -1,
                    ClusterName = "Chưa xác định",
                    ClusterDescription = "Không thể tải dữ liệu phân khúc khách hàng lúc này.",
                    ClusterTraits = new List<string>(),
                    GuestProfileName = "Chưa xác định",
                    GuestProfileDescription = "Không thể tải dữ liệu khách hiện tại lúc này.",
                    GuestProfileTraits = new List<string>(),
                    Features = new Dictionary<string, System.Text.Json.JsonElement>()
                });
            }
            catch
            {
                return Ok(new AiCustomerSegmentResponseDto
                {
                    GuestId = id,
                    Cluster = -1,
                    ClusterName = "Chưa xác định",
                    ClusterDescription = "Không thể tải dữ liệu phân khúc khách hàng lúc này.",
                    ClusterTraits = new List<string>(),
                    GuestProfileName = "Chưa xác định",
                    GuestProfileDescription = "Không thể tải dữ liệu khách hiện tại lúc này.",
                    GuestProfileTraits = new List<string>(),
                    Features = new Dictionary<string, System.Text.Json.JsonElement>()
                });
            }
        }
    }
}
