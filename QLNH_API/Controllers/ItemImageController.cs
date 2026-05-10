using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using QLNH_API.Data;
using QLNH_API.DTO;
using QLNH_API.Model;
using AutoMapper;
using AutoMapper.QueryableExtensions;

namespace QLNH_API.Controllers
{
    [ApiController]
    [Route("[controller]")]
    [Authorize(Roles = "Manager")]
    public class ItemImageController : ControllerBase
    {
        private readonly ApplicationDbcontext _context;
        private readonly IMapper _mapper;

        public ItemImageController(ApplicationDbcontext context, IMapper mapper)
        {
            _context = context;
            _mapper = mapper;
        }

        // GET: /ItemImage → lấy tất cả ảnh trong thư viện
        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            var images = await _context.ItemImage
                .Where(i => !i.Deleted)
                .OrderByDescending(i => i.Created)
                .ProjectTo<ItemImageDTO>(_mapper.ConfigurationProvider)
                .ToListAsync();

            return Ok(images);
        }

        // POST: /ItemImage → upload ảnh (dù từ máy hay từ thư viện đều dùng chung)
        [HttpPost]
        [Consumes("multipart/form-data")]
        public async Task<IActionResult> Upload([FromForm] CreateItemImageDTO dto)
        {
            if (string.IsNullOrWhiteSpace(dto.Name))
                return BadRequest("Tên ảnh là bắt buộc");

            if (dto.File == null || dto.File.Length == 0)
                return BadRequest("File ảnh không được để trống");

            if (!dto.File.ContentType.StartsWith("image/"))
                return BadRequest("Chỉ chấp nhận file ảnh");

            if (dto.File.Length > 5 * 1024 * 1024) // Giới hạn 5MB
                return BadRequest("File ảnh không được quá 5MB");

            try
            {
                using var ms = new MemoryStream();
                await dto.File.CopyToAsync(ms);

                var image = new ItemImage
                {
                    Name = dto.Name.Trim(),
                    Description = dto.Description?.Trim(),
                    Data = Convert.ToBase64String(ms.ToArray()),
                    Created = DateTime.Now,
                    Updated = DateTime.Now,
                    Deleted = false
                };

                _context.ItemImage.Add(image);
                await _context.SaveChangesAsync();

                var result = _mapper.Map<ItemImageDTO>(image);
                return CreatedAtAction(nameof(GetAll), null, result);
            }
            catch (Exception ex)
            {
                return StatusCode(500, "Lỗi server: " + ex.Message);
            }
        }

        // DELETE: /ItemImage/5 → xóa mềm
        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(int id)
        {
            var image = await _context.ItemImage.FirstOrDefaultAsync(x => x.Id == id);
            if (image == null || image.Deleted) return NotFound();

            if (image.ItemId.HasValue)
                return BadRequest("Không thể xóa ảnh đang được dùng trong món ăn");

            image.Deleted = true;
            image.Updated = DateTime.Now;
            await _context.SaveChangesAsync();

            return Ok(new { message = "Xóa ảnh thành công" });
        }
    }
}