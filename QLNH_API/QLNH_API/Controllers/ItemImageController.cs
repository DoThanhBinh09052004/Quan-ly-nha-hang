using Microsoft.AspNetCore.Mvc;
using QLNH_API.Data;
using QLNH_API.DTO;
using QLNH_API.Model;
using AutoMapper; // <-- Thêm
using Microsoft.EntityFrameworkCore; // <-- Thêm
using Microsoft.AspNetCore.Authorization; // <-- Thêm
using System.IO; // <-- Thêm
using System.Linq; // <-- Thêm
using AutoMapper.QueryableExtensions; // <-- Thêm

[ApiController]
[Route("[controller]")]
[Authorize(Roles = "Manager")] // <-- Bảo vệ controller
public class ItemImageController : ControllerBase
{
    private readonly ApplicationDbcontext _context;
    private readonly IMapper _mapper; // <-- Sử dụng AutoMapper

    public ItemImageController(ApplicationDbcontext context, IMapper mapper) // <-- Inject
    {
        _context = context;
        _mapper = mapper;
    }

    // GET: /ItemImage
    [HttpGet]
    public IActionResult GetAllItemImage()

    {

        var images = _context.ItemImage

            .Select(i => new ItemImageDTO

            {

                Id = i.Id,

                Name = i.Name,

                Description = i.Description,

                Data = i.Data,

                Created = i.Created,

                Updated = i.Updated

            }).ToList();



        return Ok(images);

    }

    // GET: /ItemImage/5
    [HttpGet("{id}")]
    public async Task<IActionResult> GetImageById(int id)
    {
        try
        {
            var image = await _context.ItemImage
                            .FirstOrDefaultAsync(i => i.Id == id && !i.Deleted);

            if (image == null) return NotFound();

            var dto = _mapper.Map<ItemImageDTO>(image); // <-- Dùng AutoMapper
            return Ok(dto);
        }
        catch (Exception ex)
        {
            return StatusCode(500, "Lỗi hệ thống: " + ex.Message);
        }
    }

    // POST: /ItemImage
    [HttpPost]
    [Consumes("multipart/form-data")]
    public async Task<IActionResult> CreateImage([FromForm] CreateItemImageDTO dto)
    {
        if (dto.File == null || dto.File.Length == 0)
        {
            return BadRequest("Không có file nào được tải lên.");
        }

        try
        {
            using var ms = new MemoryStream();
            await dto.File.CopyToAsync(ms); // <-- Dùng async

            var image = new ItemImage
            {
                Name = dto.Name,
                Description = dto.Description,
                Data = Convert.ToBase64String(ms.ToArray()), // Convert file sang base64
                Created = DateTime.Now, // Dùng Now hoặc UtcNow tùy cấu hình
                Updated = DateTime.Now,
                Deleted = false,
                ItemId = null // <-- Quan trọng: Ảnh mới chưa gán
            };

            _context.ItemImage.Add(image);
            await _context.SaveChangesAsync(); // <-- Dùng async

            var result = _mapper.Map<ItemImageDTO>(image); // <-- Dùng AutoMapper

            return CreatedAtAction(nameof(GetImageById), new { id = image.Id }, result);
        }
        catch (Exception ex)
        {
            return StatusCode(500, "Lỗi khi tải lên file: " + ex.Message);
        }
    }

    // DELETE: /ItemImage/5
    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteImage(int id)
    {
        try
        {
            var image = await _context.ItemImage.FirstOrDefaultAsync(i => i.Id == id);

            if (image == null)
                return NotFound(new { message = "Không tìm thấy ảnh" });

            // Kiểm tra xem ảnh có đang được dùng không
            if (image.ItemId.HasValue)
            {
                return BadRequest("Không thể xóa ảnh đang được gán cho một Item.");
            }

            // Sử dụng Xóa Mềm (Soft Delete) thay vì xóa vĩnh viễn
            image.Deleted = true;
            image.Updated = DateTime.Now;

            _context.Entry(image).State = EntityState.Modified;
            await _context.SaveChangesAsync(); // <-- Dùng async

            return Ok(new { message = "Đã xóa (mềm) thành công" });
        }
        catch (Exception ex)
        {
            return StatusCode(500, "Lỗi hệ thống: " + ex.Message);
        }
    }
}