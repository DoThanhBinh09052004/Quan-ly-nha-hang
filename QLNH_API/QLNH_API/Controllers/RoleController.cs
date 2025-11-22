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
    [Authorize(Roles = "Manager")]

    public class RoleController : ControllerBase
    {
        
        private readonly ApplicationDbcontext _context;
        private readonly IMapper _mapper;
        public RoleController(ApplicationDbcontext context,IMapper mapper)
        {
            _context = context;
            _mapper = mapper;
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<RoleDTO>>> GetRoles()
        {
            var roles = await _context.Role
                .Include(r => r.CreatedUser)
                .Include(r => r.UpdatedUser)
                
                .AsSplitQuery()
                .ToListAsync();

            if (roles == null || roles.Count == 0)
            {
                return NotFound("Không có Role nào trong hệ thống.");
            }

            var roleDTOs = _mapper.Map<List<RoleDTO>>(roles);

            return Ok(roleDTOs);
        }


        //Lấy Role theo ID
        [HttpGet("{Id}")]
        public Role Get([FromQuery] int ID)
        {
            return _context.Role.Where(Role => Role.Id == ID).FirstOrDefault();
        }

        //Thêm Role mới
        [HttpPost]
        public Role Post([FromBody] Role Role)
        {
            _context.Add(Role);
            _context.SaveChanges();
            return Role;
        }

        [HttpDelete("{id}")]
        public IActionResult Delete(int id)
        {
            try
            {
                var Role = _context.Role.Find(id);
                if (Role == null)
                {
                    return NotFound(); // Trả về 404 nếu không tìm thấy
                }

                _context.Role.Remove(Role);
                _context.SaveChanges();
                return NoContent(); // Trả về 204 No Content khi xóa thành công
            }
            catch (Exception ex)
            {
                // Log lỗi nếu cần
                return StatusCode(500, "Đã xảy ra lỗi khi xóa Role"); // Trả về 500 nếu có lỗi
            }
        }
        [HttpPut("{id}")]
        public async Task<IActionResult> Update(int id, [FromBody] Role updatedRole)
        {
            try
            {
                // Kiểm tra ID có khớp không
                if (id != updatedRole.Id)
                {
                    return BadRequest(new
                    {
                        success = false,
                        message = "ID trong URL không khớp với ID trong dữ liệu"
                    });
                }

                // Kiểm tra Roletồn tại
                var existingRole = await _context.Role.FindAsync(id);
                if (existingRole == null)
                {
                    return NotFound(new
                    {
                        success = false,
                        message = $"Không tìm thấy Rolevới ID {id}"
                    });
                }

                // Cập nhật thông tin (dùng AutoMapper hoặc gán thủ công)
                _context.Entry(existingRole).CurrentValues.SetValues(updatedRole);
                existingRole.Updated = DateTime.Now; // Cập nhật thời gian sửa

                await _context.SaveChangesAsync();

                return Ok(new
                {
                    success = true,
                    message = "Cập nhật Role thành công",
                    data = existingRole
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new
                {
                    success = false,
                    message = "Lỗi khi cập nhật Role",
                    error = ex.Message
                });
            }
        }
    }
}