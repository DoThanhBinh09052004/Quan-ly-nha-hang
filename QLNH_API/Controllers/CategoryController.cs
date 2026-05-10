using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using QLNH_API.Data;
using QLNH_API.Model;

namespace QLNH_API.Controllers
{
    [ApiController]
    [Route("[controller]")]
    public class CategoryController : Controller
    {
       
            private readonly ApplicationDbcontext _context;
            public CategoryController(ApplicationDbcontext contenxt)
            {
                _context = contenxt;
            }

        [HttpGet]
        [Authorize(Roles = "Manager, Cashier")]

        public async Task<ActionResult<IEnumerable<Category>>> GetCategories()
        {
            return await _context.Category.ToListAsync();
        }
        [HttpPost]
        [Authorize(Roles = "Manager")]

        public Category Post([FromBody] Category Category)
        {
            _context.Add(Category);
            _context.SaveChanges();
            return Category;
        }
        [HttpDelete("{id}")]
        [Authorize(Roles = "Manager")]

        public IActionResult Delete(int id)
        {
            try
            {
                var Category = _context.Category.Find(id);
                if (Category == null)
                {
                    return NotFound(); // Trả về 404 nếu không tìm thấy
                }

                _context.Category.Remove(Category);
                _context.SaveChanges();
                return NoContent();
            }
            catch (Exception ex)
            {

                return StatusCode(500, "Đã xảy ra lỗi khi xóa Category");
            }
        }
        [HttpPut("{id}")]
        [Authorize(Roles = "Manager")]

        public async Task<IActionResult> Update(int id, [FromBody] Category updatedCategory)
        {
            try
            {
                // Kiểm tra ID có khớp không
                if (id != updatedCategory.Id)
                {
                    return BadRequest(new
                    {
                        success = false,
                        message = "ID trong URL không khớp với ID trong dữ liệu"
                    });
                }

                // Kiểm tra Category tồn tại
                var existingCategory = await _context.Category.FindAsync(id);
                if (existingCategory == null)
                {
                    return NotFound(new
                    {
                        success = false,
                        message = $"Không tìm thấy Category với ID {id}"
                    });
                }

                // Cập nhật thông tin (dùng AutoMapper hoặc gán thủ công)
                _context.Entry(existingCategory).CurrentValues.SetValues(updatedCategory);
                existingCategory.Updated = DateTime.Now; // Cập nhật thời gian sửa

                await _context.SaveChangesAsync();

                return Ok(new
                {
                    success = true,
                    message = "Cập nhật Category thành công",
                    data = existingCategory
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new
                {
                    success = false,
                    message = "Lỗi khi cập nhật Category",
                    error = ex.Message
                });
            }
        }

    }
}
