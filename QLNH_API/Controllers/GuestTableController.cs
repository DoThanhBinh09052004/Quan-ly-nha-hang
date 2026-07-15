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

        public GuestTableController(ApplicationDbcontext context, IMapper mapper, StatusResolver statusResolver)
        {
            _context = context;
            _mapper = mapper;
            _statusResolver = statusResolver;
        }

        [HttpGet]
        [Authorize(Roles = "Manager, Cashier")]

        public async Task<ActionResult<IEnumerable<GuestTableDTO>>> GetGuestTable()
        {
            try
            {

                var GuestTable = await _context.GuestTable
                                         .Include(u => u.Status)
                                          .Include(gt => gt.Guest)
                                          .Include(gt => gt.Orders)
                                          .ToListAsync();

                if (GuestTable == null || !GuestTable.Any())
                {
                    return NotFound("No GuestTable found.");
                }

                // Ánh xạ danh sách User entities sang danh sách UserDTOs
                var GuestTableDTOs = _mapper.Map<IEnumerable<GuestTableDTO>>(GuestTable);

                return Ok(GuestTableDTOs); // Trả về 200 OK với dữ liệu DTO
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
                // Sử dụng .Include() để tải eager loading các đối tượng liên quan
                var tableStatusIds = await _statusResolver.GetIdsAsync(
                    StatusResolver.TableAvailable,
                    StatusResolver.TableReserved);

                var GuestTable = await _context.GuestTable
                                         .Include(u => u.Status)
                                          .Include(gt => gt.Guest)
                                          .Include(gt => gt.Orders)
                                          .Where(gt => gt.StatusId.HasValue && tableStatusIds.Contains(gt.StatusId.Value))
                                          .ToListAsync();

                if (GuestTable == null || !GuestTable.Any())
                {
                    return NotFound("No GuestTable found.");
                }

                // Ánh xạ danh sách User entities sang danh sách UserDTOs
                var GuestTableDTOs = _mapper.Map<IEnumerable<GuestTableDTO>>(GuestTable);

                return Ok(GuestTableDTOs); // Trả về 200 OK với dữ liệu DTO
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error getting GuestTable: {ex.Message}");
                return StatusCode(500, "Internal server error. Please try again later.");
            }
        }

        //Lấy GuestTable theo ID
        [HttpGet("{id}")]
        [Authorize(Roles = "Manager, Cashier")]

        public async Task<ActionResult<GuestTableDTO>> GetGuestTableByid(int id)
        {
            var guestTable = await _context.GuestTable
                                           .Include(gt => gt.Status)     // Tải dữ liệu của Status
                                           .Include(gt => gt.Guest)      // Tải dữ liệu của Guest
                                           .Include(gt => gt.Orders)
                                           .FirstOrDefaultAsync(gt => gt.Id == id);
            if (guestTable == null)
            {
                return NotFound();
            }
            var guestTableDTO = _mapper.Map<GuestTableDTO>(guestTable);
            return Ok(guestTableDTO);
        }

        //Thêm GuestTable mới
        [HttpPost]
        [Authorize(Roles = "Manager")]

        public async Task<ActionResult<GuestTable>> Post([FromBody] GuestTable guestTable)
        {
            try
            {
                _context.GuestTable.Add(guestTable);
                await _context.SaveChangesAsync();
                return CreatedAtAction(nameof(GetGuestTableByid), new { id = guestTable.Id }, guestTable);
            }
            catch (Exception)
            {
                return StatusCode(500, "Lỗi khi thêm Bàn ăn mới");
            }
        }

        [HttpDelete("{id}")]
        [Authorize(Roles = "Manager")]

        public IActionResult Delete(int id)
        {
            try
            {
                var GuestTable = _context.GuestTable.Find(id);
                if (GuestTable == null)
                {
                    return NotFound(); // Trả về 404 nếu không tìm thấy
                }

                _context.GuestTable.Remove(GuestTable);
                _context.SaveChanges();
                return NoContent(); // Trả về 204 No Content khi xóa thành công
            }
            catch (Exception ex)
            {
                // Log lỗi nếu cần
                return StatusCode(500, "Đã xảy ra lỗi khi xóa Bàn ăn"); // Trả về 500 nếu có lỗi
            }
        }
        [HttpPut("{id}")]
        [Authorize(Roles = "Manager")]

        public async Task<IActionResult> Update(int id, [FromBody] GuestTable updatedGuestTable)
        {
            try
            {
                // Kiểm tra ID có khớp không
                if (id != updatedGuestTable.Id)
                {
                    return BadRequest(new
                    {
                        success = false,
                        message = "ID trong URL không khớp với ID trong dữ liệu"
                    });
                }

                // Kiểm tra Bàn ăn tồn tại
                var existingGuestTable = await _context.GuestTable.FindAsync(id);
                if (existingGuestTable == null)
                {
                    return NotFound(new
                    {
                        success = false,
                        message = $"Không tìm thấy Bàn ăn với ID {id}"
                    });
                }

                // Cập nhật thông tin (dùng AutoMapper hoặc gán thủ công)
                _context.Entry(existingGuestTable).CurrentValues.SetValues(updatedGuestTable);
                existingGuestTable.Updated = DateTime.Now; // Cập nhật thời gian sửa

                await _context.SaveChangesAsync();

                return Ok(new
                {
                    success = true,
                    message = "Cập nhật Bàn ăn thành công",
                    data = existingGuestTable
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new
                {
                    success = false,
                    message = "Lỗi khi cập nhật Bàn ăn",
                    error = ex.Message
                });
            }
        }
    }
}
