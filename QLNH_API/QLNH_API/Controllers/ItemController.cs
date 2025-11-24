using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using QLNH_API.Data;
using QLNH_API.DTO;
using QLNH_API.Model;
using AutoMapper;

namespace QLNH_API.Controllers
{
    [ApiController]
    [Route("[controller]")]
    public class ItemController : ControllerBase
    {
        private readonly ApplicationDbcontext _context;
        private readonly IMapper _mapper;

        public ItemController(ApplicationDbcontext context, IMapper mapper)
        {
            _context = context;
            _mapper = mapper;
        }

        [HttpGet]
        [Authorize(Roles = "Manager, Cashier")]
        public async Task<ActionResult<IEnumerable<ItemDTO>>> GetItems()
        {
            var items = await _context.Item
                .Include(i => i.Unit)
                .Include(i => i.Category)
                .Include(i => i.ItemImages)
                .Where(i => !i.Deleted)
                .ToListAsync();

            return Ok(_mapper.Map<List<ItemDTO>>(items));
        }

        [HttpGet("{id}")]
        [Authorize(Roles = "Manager, Cashier")]
        public async Task<ActionResult<ItemDTO>> GetItem(int id)
        {
            var item = await _context.Item
                .Include(i => i.Unit).Include(i => i.Category).Include(i => i.ItemImages)
                .FirstOrDefaultAsync(i => i.Id == id && !i.Deleted);

            if (item == null) return NotFound();
            return Ok(_mapper.Map<ItemDTO>(item));
        }

        [HttpPost]
        [Authorize(Roles = "Manager")]
        public async Task<ActionResult<ItemDTO>> Create([FromBody] ItemRequestDTO dto)

        {
            if (string.IsNullOrWhiteSpace(dto.Name)) return BadRequest("Tên món bắt buộc");
            if (dto.Price < 0) return BadRequest("Giá không hợp lệ");

            var item = _mapper.Map<Item>(dto);
            item.Created = item.Updated = DateTime.Now;
            item.Deleted = false;

            await AttachImagesAsync(item, dto.ImageIds);
            _context.Item.Add(item);
            await _context.SaveChangesAsync();

            return CreatedAtAction(nameof(GetItem), new { id = item.Id }, _mapper.Map<ItemDTO>(item));
        }

        [HttpPut("{id}")]
        [Authorize(Roles = "Manager")]
        public async Task<IActionResult> Update(int id, [FromBody] ItemRequestDTO dto)
        {
            if (id != dto.Id) return BadRequest("ID không khớp");

            var item = await _context.Item
                .Include(i => i.ItemImages)
                .FirstOrDefaultAsync(i => i.Id == id && !i.Deleted);

            if (item == null) return NotFound();

            _mapper.Map(dto, item);
            item.Updated = DateTime.Now;

            // Xóa ảnh cũ
            if (item.ItemImages != null)
                foreach (var img in item.ItemImages.ToList())
                    img.ItemId = null;

            // Gắn ảnh mới
            await AttachImagesAsync(item, dto.ImageIds);
            await _context.SaveChangesAsync();

            return NoContent();
        }

        private async Task AttachImagesAsync(Item item, List<int> imageIds)
        {
            if (imageIds == null || !imageIds.Any())
            {
                item.ItemImages = new List<ItemImage>();
                return;
            }

            var images = await _context.ItemImage
                .Where(img => imageIds.Contains(img.Id) && !img.Deleted)
                .ToListAsync();

            if (images.Count != imageIds.Distinct().Count())
                throw new Exception("Một số ảnh không tồn tại hoặc đã bị xóa");

            item.ItemImages = images;
            foreach (var img in images)
                img.ItemId = item.Id;
        }

        [HttpDelete("{id}")]
        [Authorize(Roles = "Manager")]
        public async Task<IActionResult> Delete(int id)
        {
            var item = await _context.Item.Include(i => i.ItemImages).FirstOrDefaultAsync(i => i.Id == id);
            if (item == null || item.Deleted) return NotFound();

            item.Deleted = true;
            item.Updated = DateTime.Now;
            if (item.ItemImages != null)
                foreach (var img in item.ItemImages)
                    img.ItemId = null;

            await _context.SaveChangesAsync();
            return NoContent();
        }
    }
}