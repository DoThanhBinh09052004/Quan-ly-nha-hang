using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using QLNH_API.Data;
using QLNH_API.Model;
using QLNH_API.DTO;
using AutoMapper;
using Microsoft.AspNetCore.Authorization;

namespace QLNH_API.Controllers
{
    [ApiController]
    [Route("[controller]")]

    public class ItemController : ControllerBase
    {
        private readonly ApplicationDbcontext _context;
        private readonly IMapper _mapper;

        // Hàm khởi tạo, inject DbContext và AutoMapper
        public ItemController(ApplicationDbcontext context, IMapper mapper)
        {
            _context = context;
            _mapper = mapper;
        }

        /// <summary>
        /// Lấy danh sách tất cả item (chỉ lấy item chưa bị xóa mềm)
        /// </summary>
        [HttpGet]
        [Authorize(Roles = "Manager, Cashier")]

        public async Task<ActionResult<IEnumerable<ItemDTO>>> GetItems()
        {
            try
            {
                var items = await _context.Item
                    .Include(i => i.Unit)
                    .Include(i => i.Category)
                    .Include(i => i.ItemImages)
                     .Where(i => !i.Deleted)
                    .ToListAsync();

                // Dùng AutoMapper để ánh xạ sang DTO
                var itemDTOs = _mapper.Map<List<ItemDTO>>(items);

                return Ok(itemDTOs);
            }
            catch (Exception ex)
            {
                return StatusCode(500, "Lỗi hệ thống: " + ex.Message);
            }
        }

        /// <summary>
        /// Lấy chi tiết một item theo ID
        /// </summary>
        [HttpGet("{id}")]
        [Authorize(Roles = "Manager, Cashier")]

        public async Task<ActionResult<ItemDTO>> GetItemById(int id)
        {
            try
            {
                var item = await _context.Item
                    .Include(i => i.Unit)
                    .Include(i => i.Category)
                    .Include(i => i.ItemImages)
                    .FirstOrDefaultAsync(i => i.Id == id && !i.Deleted);

                if (item == null)
                {
                    return NotFound($"Không tìm thấy Item với ID {id}");
                }

                var itemDTO = _mapper.Map<ItemDTO>(item);
                return Ok(itemDTO);
            }
            catch (Exception ex)
            {
                return StatusCode(500, "Lỗi hệ thống: " + ex.Message);
            }
        }

        /// <summary>
        /// Tạo mới một item
        /// </summary>
        [HttpPost]
        [Authorize(Roles = "Manager")]

        public async Task<ActionResult<ItemDTO>> Post([FromBody] Item item)
        {
            try
            {
                if (item == null)
                    return BadRequest("Dữ liệu Item rỗng");

                if (string.IsNullOrWhiteSpace(item.Name))
                    return BadRequest("Tên Item là bắt buộc");

                if (item.Price < 0)
                    return BadRequest("Giá không được âm");

                // Đặt lại các trường hệ thống
                item.Created = DateTime.Now;
                item.Updated = DateTime.Now;
                item.Deleted = false;

                // Nếu có UnitId, kiểm tra Unit tồn tại
                if (item.UnitId.HasValue)
                {
                    var unit = await _context.Unit.FindAsync(item.UnitId.Value);
                    if (unit == null || unit.Deleted)
                        return BadRequest("Unit ID không hợp lệ");
                }

                // Nếu có CategoryId, kiểm tra Category tồn tại
                if (item.CategoryId.HasValue)
                {
                    var category = await _context.Category.FindAsync(item.CategoryId.Value);
                    if (category == null || category.Deleted)
                        return BadRequest("Category ID không hợp lệ");
                }


                _context.Item.Add(item);
                await _context.SaveChangesAsync();

                // Load lại item với các thông tin liên quan
                var createdItem = await _context.Item
                    .Include(i => i.Unit)
                    .Include(i => i.Category)
                    .Include(i => i.ItemImages)
                    .FirstOrDefaultAsync(i => i.Id == item.Id);

                var itemDTO = _mapper.Map<ItemDTO>(createdItem);
                return CreatedAtAction(nameof(GetItemById), new { id = itemDTO.Id }, itemDTO);
            }
            catch (Exception ex)
            {
                return StatusCode(500, "Lỗi hệ thống: " + ex.Message);
            }
        }

        /// <summary>
        /// Cập nhật thông tin một item
        /// </summary>
        [HttpPut("{id}")]
        [Authorize(Roles = "Manager")]

        public async Task<IActionResult> UpdateItem(int id, Item item)
        {
            try
            {
                if (id != item.Id)
                    return BadRequest("ID không khớp");

                var existingItem = await _context.Item.FirstOrDefaultAsync(i => i.Id == id && !i.Deleted);

                if (existingItem == null)
                    return NotFound($"Không tìm thấy Item với ID {id}");

                if (string.IsNullOrWhiteSpace(item.Name))
                    return BadRequest("Tên Item là bắt buộc");

                if (item.Price < 0)
                    return BadRequest("Giá không được âm");

                // Kiểm tra Unit nếu có
                if (item.UnitId.HasValue)
                {
                    var unit = await _context.Unit.FindAsync(item.UnitId.Value);
                    if (unit == null || unit.Deleted)
                        return BadRequest("Unit ID không hợp lệ");
                }

                // Kiểm tra Category nếu có
                if (item.CategoryId.HasValue)
                {
                    var category = await _context.Category.FindAsync(item.CategoryId.Value);
                    if (category == null || category.Deleted)
                        return BadRequest("Category ID không hợp lệ");
                }

                // Gán lại giá trị
                existingItem.Name = item.Name;
                existingItem.Description = item.Description;
                existingItem.Price = item.Price;
                existingItem.Discount = item.Discount;
                existingItem.Quantity = item.Quantity;
                existingItem.UnitId = item.UnitId;
                existingItem.CategoryId = item.CategoryId;
                existingItem.Updated = DateTime.Now;

                _context.Entry(existingItem).State = EntityState.Modified;
                await _context.SaveChangesAsync();

                return NoContent();
            }
            catch (Exception ex)
            {
                return StatusCode(500, "Lỗi hệ thống: " + ex.Message);
            }
        }

        /// <summary>
        /// Xóa mềm một item
        /// </summary>
        [HttpDelete("{id}")]
        [Authorize(Roles = "Manager")]

        public async Task<IActionResult> DeleteItem(int id)
        {
            try
            {
                var item = await _context.Item.FindAsync(id);

                if (item == null || item.Deleted)
                    return NotFound($"Không tìm thấy Item với ID {id}");

                item.Deleted = true;
                item.Updated = DateTime.Now;

                _context.Entry(item).State = EntityState.Modified;
                await _context.SaveChangesAsync();

                return NoContent();
            }
            catch (Exception ex)
            {
                return StatusCode(500, "Lỗi hệ thống: " + ex.Message);
            }
        }
    }
}
