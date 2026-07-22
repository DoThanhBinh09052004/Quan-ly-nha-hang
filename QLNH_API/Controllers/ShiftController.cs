using AutoMapper;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using QLNH_API.Data;
using QLNH_API.DTO;
using QLNH_API.Model;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace QLNH_API.Controllers
{
    [ApiController]
    [Route("[controller]")]
    public class ShiftController : ControllerBase
    {
        private readonly ApplicationDbcontext _context;
        private readonly IMapper _mapper;

        public ShiftController(ApplicationDbcontext context, IMapper mapper)
        {
            _context = context;
            _mapper = mapper;
        }

        // Lấy toàn bộ danh sách ca làm việc chưa bị xóa
        [HttpGet]
        [Authorize(Roles = "Manager, Service Staff, Kitchen")]
        public async Task<ActionResult<IEnumerable<ShiftDTO>>> GetShifts()
        {
            var shifts = await _context.Shift
                .Where(s => !s.Deleted)
                .ToListAsync();

            var shiftDTOs = _mapper.Map<List<ShiftDTO>>(shifts);
            return Ok(shiftDTOs);
        }

        // Lấy chi tiết một ca làm việc
        [HttpGet("{id}")]
        [Authorize(Roles = "Manager, Service Staff, Kitchen")]
        public async Task<ActionResult<ShiftDTO>> GetShift(int id)
        {
            var shift = await _context.Shift
                .FirstOrDefaultAsync(s => s.Id == id && !s.Deleted);

            if (shift == null)
            {
                return NotFound("Không tìm thấy ca làm việc.");
            }

            var shiftDTO = _mapper.Map<ShiftDTO>(shift);
            return Ok(shiftDTO);
        }

        // Tạo mới một ca làm việc
        [HttpPost]
        [Authorize(Roles = "Manager")]
        public async Task<ActionResult<ShiftDTO>> Create([FromBody] ShiftRequestDTO dto)
        {
            if (string.IsNullOrWhiteSpace(dto.Name))
            {
                return BadRequest("Tên ca không được để trống.");
            }

            if (dto.StartTime >= dto.EndTime)
            {
                return BadRequest("Thời gian bắt đầu phải nhỏ hơn thời gian kết thúc.");
            }

            // Kiểm tra trùng tên ca làm việc
            var nameExists = await _context.Shift
                .AnyAsync(s => s.Name.ToLower() == dto.Name.ToLower() && !s.Deleted);
            if (nameExists)
            {
                return BadRequest("Tên ca làm việc đã tồn tại.");
            }

            var shift = _mapper.Map<Shift>(dto);
            shift.Created = DateTime.Now;
            shift.Updated = DateTime.Now;
            shift.Deleted = false;

            _context.Shift.Add(shift);
            await _context.SaveChangesAsync();

            var resultDTO = _mapper.Map<ShiftDTO>(shift);
            return CreatedAtAction(nameof(GetShift), new { id = shift.Id }, resultDTO);
        }

        // Cập nhật thông tin ca làm việc
        [HttpPut("{id}")]
        [Authorize(Roles = "Manager")]
        public async Task<IActionResult> Update(int id, [FromBody] ShiftRequestDTO dto)
        {
            if (id != dto.Id)
            {
                return BadRequest("ID không khớp.");
            }

            var shift = await _context.Shift
                .FirstOrDefaultAsync(s => s.Id == id && !s.Deleted);

            if (shift == null)
            {
                return NotFound("Không tìm thấy ca làm việc cần cập nhật.");
            }

            if (string.IsNullOrWhiteSpace(dto.Name))
            {
                return BadRequest("Tên ca không được để trống.");
            }

            if (dto.StartTime >= dto.EndTime)
            {
                return BadRequest("Thời gian bắt đầu phải nhỏ hơn thời gian kết thúc.");
            }

            // Kiểm tra trùng tên với ca khác
            var nameExists = await _context.Shift
                .AnyAsync(s => s.Name.ToLower() == dto.Name.ToLower() && s.Id != id && !s.Deleted);
            if (nameExists)
            {
                return BadRequest("Tên ca làm việc đã tồn tại.");
            }

            _mapper.Map(dto, shift);
            shift.Updated = DateTime.Now;

            await _context.SaveChangesAsync();

            return Ok(new
            {
                success = true,
                message = "Cập nhật ca làm việc thành công",
                data = _mapper.Map<ShiftDTO>(shift)
            });
        }

        // Xóa mềm ca làm việc
        [HttpDelete("{id}")]
        [Authorize(Roles = "Manager")]
        public async Task<IActionResult> Delete(int id)
        {
            var shift = await _context.Shift
                .FirstOrDefaultAsync(s => s.Id == id && !s.Deleted);

            if (shift == null)
            {
                return NotFound("Không tìm thấy ca làm việc cần xóa.");
            }

            shift.Deleted = true;
            shift.Updated = DateTime.Now;

            await _context.SaveChangesAsync();
            return NoContent();
        }
    }
}
