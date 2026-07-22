using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using QLNH_API.Data;
using QLNH_API.Model;

namespace QLNH_API.Controllers
{
    [ApiController]
    [Route("[controller]")]
    public class StatusController : ControllerBase
    {
        private readonly ApplicationDbcontext _context;
        public StatusController(ApplicationDbcontext context)
        {
            _context = context;
        }

        [HttpGet]
        [Authorize(Roles = "Manager, Service Staff, Kitchen")]

        public IEnumerable<Status> GetStatuses()
        {
            return _context.Status.ToList();
        }
        [HttpPost]
        [Authorize(Roles = "Manager")]

        public Status Post([FromBody] Status Status)
        {
            _context.Add(Status);
            _context.SaveChanges();
            return Status;
        }

        [HttpDelete("{id}")]
        [Authorize(Roles = "Manager")]

        public IActionResult Delete(int id)
        {
            try
            {
                var Status = _context.Status.Find(id);
                if (Status == null)
                {
                    return NotFound(); // Trả về 404 nếu không tìm thấy
                }

                _context.Status.Remove(Status);
                _context.SaveChanges();
                return NoContent();
            }
            catch (Exception ex)
            {
                
                return StatusCode(500, "Đã xảy ra lỗi khi xóa Status"); 
            }
        }
        [HttpPut("{id}")]
        [Authorize(Roles = "Manager")]

        public async Task<IActionResult> Update(int id, [FromBody] Status updatedstatus)
        {
            try
            {
                // Kiểm tra ID có khớp không
                if (id != updatedstatus.Id)
                {
                    return BadRequest(new
                    {
                        success = false,
                        message = "ID trong URL không khớp với ID trong dữ liệu"
                    });
                }

                // Kiểm tra status tồn tại
                var existingstatus = await _context.Status.FindAsync(id);
                if (existingstatus == null)
                {
                    return NotFound(new
                    {
                        success = false,
                        message = $"Không tìm thấy status với ID {id}"
                    });
                }

                // Cập nhật thông tin (dùng AutoMapper hoặc gán thủ công)
                _context.Entry(existingstatus).CurrentValues.SetValues(updatedstatus);
                existingstatus.Updated = DateTime.Now; // Cập nhật thời gian sửa

                await _context.SaveChangesAsync();

                return Ok(new
                {
                    success = true,
                    message = "Cập nhật status thành công",
                    data = existingstatus
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new
                {
                    success = false,
                    message = "Lỗi khi cập nhật status",
                    error = ex.Message
                });
            }
        }

    }
       
    }
