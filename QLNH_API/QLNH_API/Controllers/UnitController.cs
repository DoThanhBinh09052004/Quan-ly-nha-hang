using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using QLNH_API.Data;
using QLNH_API.Model;

namespace QLNH_API.Controllers
{
    [ApiController]
    [Route("[controller]")]
    public class UnitController : ControllerBase
    {
        private readonly ApplicationDbcontext _context;
        public UnitController(ApplicationDbcontext context)
        {
            _context = context;
        }

        [HttpGet]
        [Authorize(Roles = "Manager, Cashier")]

        public async Task<ActionResult<IEnumerable<Unit>>> GetUnits()
        {
            return await _context.Unit.ToListAsync();
        }

        [HttpDelete("{id}")]
        [Authorize(Roles = "Manager")]
        public IActionResult Delete(int id)
        {
            try
            {
                var Unit = _context.Unit.Find(id);
                if (Unit == null)
                {
                    return NotFound(); // Trả về 404 nếu không tìm thấy
                }

                _context.Unit.Remove(Unit);
                _context.SaveChanges();
                return NoContent();
            }
            catch (Exception ex)
            {

                return StatusCode(500, "Đã xảy ra lỗi khi xóa Unit");
            }
        }
        //Thêm đơn vị
        [HttpPost]
        [Authorize(Roles = "Manager")]

        public Unit Post([FromBody] Unit unit)
        {
            _context.Add(unit);
            _context.SaveChanges();
            return unit;
        }
        //Cập nhập theo ai
        [HttpPut("{id}")]
        [Authorize(Roles = "Manager")]

        public async Task<IActionResult> Update(int id, [FromBody] Unit updatedUnit)
        {
            try
            {
                // Kiểm tra ID có khớp không
                if (id != updatedUnit.Id)
                {
                    return BadRequest(new
                    {
                        success = false,
                        message = "ID trong URL không khớp với ID trong dữ liệu"
                    });
                }

                // Kiểm tra Unit tồn tại
                var existingUnit = await _context.Unit.FindAsync(id);
                if (existingUnit == null)
                {
                    return NotFound(new
                    {
                        success = false,
                        message = $"Không tìm thấy Unit với ID {id}"
                    });
                }

                // Cập nhật thông tin (dùng AutoMapper hoặc gán thủ công)
                _context.Entry(existingUnit).CurrentValues.SetValues(updatedUnit);
                existingUnit.Updated = DateTime.Now; // Cập nhật thời gian sửa

                await _context.SaveChangesAsync();

                return Ok(new
                {
                    success = true,
                    message = "Cập nhật Unit thành công",
                    data = existingUnit
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new
                {
                    success = false,
                    message = "Lỗi khi cập nhật Unit",
                    error = ex.Message
                });
            }
        }

    }
}