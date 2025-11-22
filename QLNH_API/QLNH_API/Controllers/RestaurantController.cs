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

    public class RestaurantController : Controller
    {
        private readonly ApplicationDbcontext _context;
        private readonly IMapper _mapper;

        public RestaurantController(ApplicationDbcontext context, IMapper mapper)
        {
            _context = context;
            _mapper = mapper;
        }

        [HttpGet]
        [Authorize(Roles = "Manager, Cashier")]

        public async Task<ActionResult<IEnumerable<RestaurantDTO>>> Getrestaurant()
        {
            try
            {
                // Sử dụng .Include() để tải eager loading các đối tượng liên quan

                var restaurant = await _context.Restaurant
                                          .Include(u => u.CreatedUser)
                                          .Include(u => u.UpdatedUser)
                                          .Where(u=>!u.Deleted)
                                          .ToListAsync();

                if (restaurant == null || !restaurant.Any())
                {
                    return NotFound("No restaurant found.");
                }

                // Ánh xạ danh sách User entities sang danh sách UserDTOs
                var RestaurantDTOs = _mapper.Map<IEnumerable<RestaurantDTO>>(restaurant);

                return Ok(RestaurantDTOs); // Trả về 200 OK với dữ liệu DTO
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error getting restaurant: {ex.Message}");
                return StatusCode(500, "Internal server error. Please try again later.");
            }
        }

        //Lấy Restaurant theo ID
        [HttpGet("{Id}")]
        [Authorize(Roles = "Manager, Cashier")]

        public Restaurant Get([FromQuery] int ID)
        {
            return _context.Restaurant.Where(restaurant => restaurant.Id == ID).FirstOrDefault();
        }

        //Thêm Restaurant mới
        [HttpPost]
        [Authorize(Roles = "Manager")]

        public Restaurant Post([FromBody] Restaurant restaurant)
        {
            _context.Add(restaurant);
            _context.SaveChanges();
            return restaurant;
        }

        [HttpDelete("{id}")]
        [Authorize(Roles = "Manager")]

        public IActionResult Delete(int id)
        {
            try
            {
                var restaurant = _context.Restaurant.Find(id);
                if (restaurant == null)
                {
                    return NotFound();
                }

                restaurant.Deleted = true;
                restaurant.Updated = DateTime.Now;

                _context.SaveChanges();
                return NoContent(); // Trả về 204 No Content khi xóa thành công
            }
            catch (Exception ex)
            {
                // Log lỗi nếu cần
                return StatusCode(500, "Đã xảy ra lỗi khi xóa nhà hàng"); // Trả về 500 nếu có lỗi
            }
        }
        [HttpPut("{id}")]
        [Authorize(Roles = "Manager")]

        public async Task<IActionResult> Update(int id, [FromBody] Restaurant updatedRestaurant)
        {
            try
            {
                // Kiểm tra ID có khớp không
                if (id != updatedRestaurant.Id)
                {
                    return BadRequest(new
                    {
                        success = false,
                        message = "ID trong URL không khớp với ID trong dữ liệu"
                    });
                }

                // Kiểm tra nhà hàng tồn tại
                var existingRestaurant = await _context.Restaurant.FindAsync(id);
                if (existingRestaurant == null)
                {
                    return NotFound(new
                    {
                        success = false,
                        message = $"Không tìm thấy nhà hàng với ID {id}"
                    });
                }

                // Cập nhật thông tin (dùng AutoMapper hoặc gán thủ công)
                _context.Entry(existingRestaurant).CurrentValues.SetValues(updatedRestaurant);
                existingRestaurant.Updated = DateTime.Now; // Cập nhật thời gian sửa

                await _context.SaveChangesAsync();

                return Ok(new
                {
                    success = true,
                    message = "Cập nhật nhà hàng thành công",
                    data = existingRestaurant
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new
                {
                    success = false,
                    message = "Lỗi khi cập nhật nhà hàng",
                    error = ex.Message
                });
            }
        }
    }
}

