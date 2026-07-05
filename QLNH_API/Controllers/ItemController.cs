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
        [HttpGet("low-stock")]
        [Authorize(Roles = "Manager")]
        public async Task<ActionResult<IEnumerable<ItemDTO>>> GetLowStockItems([FromQuery] int threshold = 10)
        {
            var items = await _context.Item
                .Include(i => i.Unit)
                .Include(i => i.Category)
                .Where(i => !i.Deleted && i.Quantity <= threshold)
                .ToListAsync();

            return Ok(_mapper.Map<List<ItemDTO>>(items));
        }

        // GET: /item/best-seller?days=30&top=10
        [HttpGet("best-seller")]
        [Authorize(Roles = "Manager, Cashier")]
        public async Task<ActionResult> GetBestSeller([FromQuery] int days = 30, [FromQuery] int top = 10)
        {
            var fromDate = DateTime.Now.AddDays(-days);

            var bestSellers = await _context.OrderItem
                .Include(oi => oi.Item)
                .Where(oi => oi.Created >= fromDate && !oi.Deleted && !oi.Voided)
                .GroupBy(oi => new { oi.ItemId, oi.Name })
                .Select(g => new
                {
                    ItemId = g.Key.ItemId,
                    ItemName = g.Key.Name,
                    TotalQuantity = g.Sum(x => x.Quantity),
                    TotalRevenue = g.Sum(x => x.SalePrice * x.Quantity),
                    OrderCount = g.Select(x => x.OrderId).Distinct().Count()
                })
                .OrderByDescending(x => x.TotalQuantity)
                .Take(top)
                .ToListAsync();

            return Ok(bestSellers);
        }
    }
}
