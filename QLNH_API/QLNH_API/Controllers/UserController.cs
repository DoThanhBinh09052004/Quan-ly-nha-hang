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

    public class UserController : ControllerBase
    {
        private readonly ApplicationDbcontext _context;
        private readonly IMapper _mapper;
        public UserController(ApplicationDbcontext contenxt,IMapper mapper)
        {
            _context = contenxt;
            _mapper = mapper;
        }

        [HttpGet]
        [Authorize(Roles = "Manager")]
        public async Task<ActionResult<IEnumerable<UserDTO>>> GetUsers()
        {
            var users = await _context.User
                .Include(u => u.CreatedUser)
                .Include(u => u.UpdatedUser)
                .Include(u => u.role)
                .Include(u => u.restaurant)
                .Where(i => !i.Deleted)
                .AsSplitQuery()
                .ToListAsync();

            if (users == null || users.Count == 0)

            {
                return NotFound("Không có người dùng nào trong hệ thống.");
            }
            var userDTOs = _mapper.Map<List<UserDTO>>(users);
            
            return Ok(userDTOs);
        }
        //Lấy User theo ID
        [HttpGet("{id}")]
         [Authorize(Roles = "Manager")]

        public async Task<ActionResult<UserDTO>> Get(int id)
        {
            var User = await _context.User
                                           .Include(u => u.restaurant) // Tải dữ liệu của Restaurant
                                           .Include(u => u.role)
                                           .Include(u => u.CreatedUser)
                                           .Include(u => u.UpdatedUser)
                                           // Tải dữ liệu của Guest
                                           .FirstOrDefaultAsync(u => u.Id == id);
            if (User == null)
            {
                return NotFound();
            }
            var UserDTO = _mapper.Map<UserDTO>(User);
            return Ok(UserDTO);
        }

        [HttpPost]
        [Authorize(Roles = "Manager")]

        public async Task<ActionResult<User>> Post([FromBody] User User)
        {
            try
            {
                User.Created = DateTime.Now;
                User.Updated = DateTime.Now;
                

                _context.Add(User);
                await _context.SaveChangesAsync();

                return CreatedAtAction(nameof(Get), new { id = User.Id }, User);
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Lỗi khi thêm User mới: {ex.Message}");
            }
        }
        [HttpDelete("{id}")]
        [Authorize(Roles = "Manager")]

        public IActionResult Delete(int id)
        {
            try
            {
                var User = _context.User.Find(id);
                if (User == null)
                {
                    return NotFound();
                }

                User.Deleted = true;
                User.Updated = DateTime.Now;

                _context.SaveChanges();
                return NoContent(); // Trả về 204 No Content khi xóa thành công
            }
            catch (Exception ex)
            {
                // Log lỗi nếu cần
                return StatusCode(500, "Đã xảy ra lỗi khi xóa User"); // Trả về 500 nếu có lỗi
            }
        }
        [HttpPut("{id}")]
        [Authorize(Roles = "Manager")]

        public async Task<IActionResult> Update(int id, [FromBody] User updatedUser)
        {
            try
            {
                // Kiểm tra ID có khớp không
                if (id != updatedUser.Id)
                {
                    return BadRequest(new
                    {
                        success = false,
                        message = "ID trong URL không khớp với ID trong dữ liệu"
                    });
                }

                // Kiểm tra User tồn tại
                var existingUser = await _context.User.FindAsync(id);
                if (existingUser == null)
                {
                    return NotFound(new
                    {
                        success = false,
                        message = $"Không tìm thấy User với ID {id}"
                    });
                }

                // Cập nhật thông tin (dùng AutoMapper hoặc gán thủ công)
                _context.Entry(existingUser).CurrentValues.SetValues(updatedUser);
                existingUser.Updated = DateTime.Now; // Cập nhật thời gian sửa

                await _context.SaveChangesAsync();

                return Ok(new
                {
                    success = true,
                    message = "Cập nhật User thành công",
                    data = existingUser
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new
                {
                    success = false,
                    message = "Lỗi khi cập nhật User",
                    error = ex.Message
                });
            }
        }
    }
}
