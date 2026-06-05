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
    public class WorkShiftController : ControllerBase
    {
        private readonly ApplicationDbcontext _context;
        private readonly IMapper _mapper;

        public WorkShiftController(ApplicationDbcontext context, IMapper mapper)
        {
            _context = context;
            _mapper = mapper;
        }

        // Lấy danh sách phân ca làm việc, hỗ trợ lọc theo UserId và khoảng thời gian (WorkDate)
        [HttpGet]
        [Authorize(Roles = "Manager, Cashier")]
        public async Task<ActionResult<IEnumerable<WorkShiftDTO>>> GetWorkShifts(
            [FromQuery] int? userId,
            [FromQuery] DateTime? fromDate,
            [FromQuery] DateTime? toDate)
        {
            var query = _context.WorkShift
                .Include(ws => ws.User)
                .Include(ws => ws.Shift)
                .Where(ws => !ws.Deleted && !ws.User.Deleted && !ws.Shift.Deleted);

            if (userId.HasValue)
            {
                query = query.Where(ws => ws.UserId == userId.Value);
            }

            if (fromDate.HasValue)
            {
                query = query.Where(ws => ws.WorkDate >= fromDate.Value.Date);
            }

            if (toDate.HasValue)
            {
                query = query.Where(ws => ws.WorkDate <= toDate.Value.Date.AddDays(1).AddTicks(-1));
            }

            var workShifts = await query.ToListAsync();
            var workShiftDTOs = _mapper.Map<List<WorkShiftDTO>>(workShifts);

            return Ok(workShiftDTOs);
        }

        // Lấy chi tiết lịch phân ca
        [HttpGet("{id}")]
        [Authorize(Roles = "Manager, Cashier")]
        public async Task<ActionResult<WorkShiftDTO>> GetWorkShift(int id)
        {
            var workShift = await _context.WorkShift
                .Include(ws => ws.User)
                .Include(ws => ws.Shift)
                .FirstOrDefaultAsync(ws => ws.Id == id && !ws.Deleted);

            if (workShift == null)
            {
                return NotFound("Không tìm thấy phân ca này.");
            }

            var workShiftDTO = _mapper.Map<WorkShiftDTO>(workShift);
            return Ok(workShiftDTO);
        }

        // Phân ca làm việc mới cho nhân viên
        [HttpPost]
        [Authorize(Roles = "Manager")]
        public async Task<ActionResult<WorkShiftDTO>> Create([FromBody] WorkShiftRequestDTO dto)
        {
            // Kiểm tra User tồn tại và chưa bị xóa
            var user = await _context.User.FirstOrDefaultAsync(u => u.Id == dto.UserId && !u.Deleted);
            if (user == null)
            {
                return BadRequest("Nhân viên không tồn tại hoặc đã bị xóa.");
            }

            // Kiểm tra Shift tồn tại và chưa bị xóa
            var shift = await _context.Shift.FirstOrDefaultAsync(s => s.Id == dto.ShiftId && !s.Deleted);
            if (shift == null)
            {
                return BadRequest("Ca làm việc không tồn tại hoặc đã bị xóa.");
            }

            // Chuẩn hóa ngày làm việc về 00:00:00 để dễ so sánh và lọc
            var workDateOnly = dto.WorkDate.Date;

            // Kiểm tra xem nhân viên đã được phân ca này vào ngày này chưa
            var exists = await _context.WorkShift
                .AnyAsync(ws => ws.UserId == dto.UserId && ws.ShiftId == dto.ShiftId && ws.WorkDate == workDateOnly && !ws.Deleted);

            if (exists)
            {
                return BadRequest("Nhân viên đã được phân ca làm việc này trong ngày hôm đó.");
            }

            var workShift = _mapper.Map<WorkShift>(dto);
            workShift.WorkDate = workDateOnly;
            workShift.Created = DateTime.Now;
            workShift.Updated = DateTime.Now;
            workShift.Deleted = false;

            _context.WorkShift.Add(workShift);
            await _context.SaveChangesAsync();

            // Load lại đầy đủ thông tin User và Shift để map ra DTO trả về cho client
            await _context.Entry(workShift).Reference(ws => ws.User).LoadAsync();
            await _context.Entry(workShift).Reference(ws => ws.Shift).LoadAsync();

            var resultDTO = _mapper.Map<WorkShiftDTO>(workShift);
            return CreatedAtAction(nameof(GetWorkShift), new { id = workShift.Id }, resultDTO);
        }

        // Cập nhật phân ca làm việc
        [HttpPut("{id}")]
        [Authorize(Roles = "Manager")]
        public async Task<IActionResult> Update(int id, [FromBody] WorkShiftRequestDTO dto)
        {
            if (id != dto.Id)
            {
                return BadRequest("ID không khớp.");
            }

            var workShift = await _context.WorkShift
                .FirstOrDefaultAsync(ws => ws.Id == id && !ws.Deleted);

            if (workShift == null)
            {
                return NotFound("Không tìm thấy phân ca làm việc cần cập nhật.");
            }

            // Kiểm tra User tồn tại và chưa bị xóa
            var user = await _context.User.FirstOrDefaultAsync(u => u.Id == dto.UserId && !u.Deleted);
            if (user == null)
            {
                return BadRequest("Nhân viên không tồn tại hoặc đã bị xóa.");
            }

            // Kiểm tra Shift tồn tại và chưa bị xóa
            var shift = await _context.Shift.FirstOrDefaultAsync(s => s.Id == dto.ShiftId && !s.Deleted);
            if (shift == null)
            {
                return BadRequest("Ca làm việc không tồn tại hoặc đã bị xóa.");
            }

            var workDateOnly = dto.WorkDate.Date;

            // Kiểm tra trùng lịch phân ca khác
            var exists = await _context.WorkShift
                .AnyAsync(ws => ws.UserId == dto.UserId && ws.ShiftId == dto.ShiftId && ws.WorkDate == workDateOnly && ws.Id != id && !ws.Deleted);

            if (exists)
            {
                return BadRequest("Nhân viên đã được phân ca làm việc này trong ngày hôm đó.");
            }

            _mapper.Map(dto, workShift);
            workShift.WorkDate = workDateOnly;
            workShift.Updated = DateTime.Now;

            await _context.SaveChangesAsync();

            // Load lại đầy đủ thông tin User và Shift để map ra DTO
            await _context.Entry(workShift).Reference(ws => ws.User).LoadAsync();
            await _context.Entry(workShift).Reference(ws => ws.Shift).LoadAsync();

            return Ok(new
            {
                success = true,
                message = "Cập nhật phân ca thành công",
                data = _mapper.Map<WorkShiftDTO>(workShift)
            });
        }

        // Xóa mềm phân ca làm việc (hủy lịch ca)
        [HttpDelete("{id}")]
        [Authorize(Roles = "Manager")]
        public async Task<IActionResult> Delete(int id)
        {
            var workShift = await _context.WorkShift
                .FirstOrDefaultAsync(ws => ws.Id == id && !ws.Deleted);

            if (workShift == null)
            {
                return NotFound("Không tìm thấy phân ca cần xóa.");
            }

            workShift.Deleted = true;
            workShift.Updated = DateTime.Now;

            await _context.SaveChangesAsync();
            return NoContent();
        }
    }
}
