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
    public class GuestTableController : ControllerBase
    {
        private readonly ApplicationDbcontext _context;
        private readonly IMapper _mapper;
        private readonly StatusResolver _statusResolver;
        private readonly ReservationService _reservationService;

        public GuestTableController(
            ApplicationDbcontext context,
            IMapper mapper,
            StatusResolver statusResolver,
            ReservationService reservationService)
        {
            _context = context;
            _mapper = mapper;
            _statusResolver = statusResolver;
            _reservationService = reservationService;
        }

        [HttpGet]
        [Authorize(Roles = "Manager, Cashier")]
        public async Task<ActionResult<IEnumerable<GuestTableDTO>>> GetGuestTable()
        {
            try
            {
                var tables = await _context.GuestTable
                    .Include(table => table.Status)
                    .Include(table => table.Guest)
                    .Include(table => table.Orders!)
                        .ThenInclude(order => order.Guest)
                    .Where(table => !table.Deleted)
                    .ToListAsync();

                if (tables.Count == 0)
                {
                    return NotFound("No GuestTable found.");
                }

                await _reservationService.ApplyEffectiveStatusesAsync(tables);
                return Ok(_mapper.Map<IEnumerable<GuestTableDTO>>(tables));
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error getting GuestTable: {ex.Message}");
                return StatusCode(500, "Internal server error. Please try again later.");
            }
        }

        [HttpGet("available")]
        [Authorize(Roles = "Manager, Cashier")]
        public async Task<ActionResult<IEnumerable<GuestTableDTO>>> GetEmptyGuestTable()
        {
            try
            {
                return Ok(await _reservationService.GetOrderAvailableTablesAsync());
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error getting available GuestTable: {ex.Message}");
                return StatusCode(500, "Internal server error. Please try again later.");
            }
        }

        [HttpGet("{id}")]
        [Authorize(Roles = "Manager, Cashier")]
        public async Task<ActionResult<GuestTableDTO>> GetGuestTableByid(int id)
        {
            var table = await _context.GuestTable
                .Include(item => item.Status)
                .Include(item => item.Guest)
                .Include(item => item.Orders!)
                    .ThenInclude(order => order.Guest)
                .FirstOrDefaultAsync(item => item.Id == id && !item.Deleted);
            if (table == null)
            {
                return NotFound();
            }

            await _reservationService.ApplyEffectiveStatusesAsync(new[] { table });
            return Ok(_mapper.Map<GuestTableDTO>(table));
        }

        [HttpPost]
        [Authorize(Roles = "Manager")]
        public async Task<ActionResult<GuestTable>> Post([FromBody] GuestTable guestTable)
        {
            try
            {
                if (guestTable.StatusManuallyOverridden)
                {
                    if (!await IsTableStatusAsync(guestTable.StatusId))
                    {
                        return BadRequest(new { message = "Trạng thái thủ công phải thuộc loại TABLE." });
                    }
                }
                else
                {
                    guestTable.StatusId = await _statusResolver.GetIdAsync(StatusResolver.TableAvailable);
                }

                _context.GuestTable.Add(guestTable);
                await _context.SaveChangesAsync();
                return CreatedAtAction(nameof(GetGuestTableByid), new { id = guestTable.Id }, guestTable);
            }
            catch (Exception)
            {
                return StatusCode(500, "Lỗi khi thêm bàn ăn mới");
            }
        }

        [HttpDelete("{id}")]
        [Authorize(Roles = "Manager")]
        public async Task<IActionResult> Delete(int id)
        {
            try
            {
                var table = await _context.GuestTable.FindAsync(id);
                if (table == null)
                {
                    return NotFound();
                }

                _context.GuestTable.Remove(table);
                await _context.SaveChangesAsync();
                return NoContent();
            }
            catch (Exception)
            {
                return StatusCode(500, "Đã xảy ra lỗi khi xóa bàn ăn");
            }
        }

        [HttpPut("{id}")]
        [Authorize(Roles = "Manager")]
        public async Task<IActionResult> Update(int id, [FromBody] GuestTable updatedGuestTable)
        {
            try
            {
                if (id != updatedGuestTable.Id)
                {
                    return BadRequest(new { success = false, message = "ID trong URL không khớp với dữ liệu." });
                }

                var existingGuestTable = await _context.GuestTable.FindAsync(id);
                if (existingGuestTable == null)
                {
                    return NotFound(new { success = false, message = $"Không tìm thấy bàn ăn với ID {id}." });
                }

                if (updatedGuestTable.StatusManuallyOverridden &&
                    !await IsTableStatusAsync(updatedGuestTable.StatusId))
                {
                    return BadRequest(new
                    {
                        success = false,
                        message = "Trạng thái thủ công phải thuộc loại TABLE."
                    });
                }

                _context.Entry(existingGuestTable).CurrentValues.SetValues(updatedGuestTable);
                existingGuestTable.Updated = DateTime.Now;
                await _context.SaveChangesAsync();

                if (!existingGuestTable.StatusManuallyOverridden)
                {
                    await _reservationService.RefreshTableStatusAsync(existingGuestTable.Id);
                }

                return Ok(new
                {
                    success = true,
                    message = "Cập nhật bàn ăn thành công.",
                    data = existingGuestTable
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new
                {
                    success = false,
                    message = "Lỗi khi cập nhật bàn ăn.",
                    error = ex.Message
                });
            }
        }

        private async Task<bool> IsTableStatusAsync(int? statusId)
        {
            return statusId.HasValue && await _context.Status.AnyAsync(status =>
                status.Id == statusId.Value && !status.Deleted && status.Type == "TABLE");
        }
    }
}
