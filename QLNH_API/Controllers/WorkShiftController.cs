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

        private IQueryable<WorkShift> GetActiveWorkShiftsQuery()
        {
            return _context.WorkShift
                .Include(ws => ws.User)
                .Include(ws => ws.Shift)
                .Where(ws => !ws.Deleted && ws.User != null && !ws.User.Deleted && ws.Shift != null && !ws.Shift.Deleted);
        }

        [HttpGet]
        [Authorize(Roles = "Manager, Service Staff")]
        public async Task<ActionResult<IEnumerable<WorkShiftDTO>>> GetWorkShifts(
            [FromQuery] int? userId,
            [FromQuery] DateTime? fromDate,
            [FromQuery] DateTime? toDate)
        {
            var query = GetActiveWorkShiftsQuery();

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

        [HttpGet("mine")]
        [Authorize(Roles = "Manager, Service Staff, Kitchen")]
        public async Task<ActionResult<IEnumerable<WorkShiftDTO>>> GetMyWorkShifts(
            [FromQuery] DateTime? fromDate,
            [FromQuery] DateTime? toDate)
        {
            var username = User.Identity?.Name;
            if (string.IsNullOrWhiteSpace(username))
            {
                return Unauthorized();
            }

            var userId = await _context.User
                .Where(u => u.Username == username && !u.Deleted)
                .Select(u => (int?)u.Id)
                .FirstOrDefaultAsync();

            if (!userId.HasValue)
            {
                return Unauthorized();
            }

            var query = GetActiveWorkShiftsQuery().Where(ws => ws.UserId == userId.Value);

            if (fromDate.HasValue)
            {
                query = query.Where(ws => ws.WorkDate >= fromDate.Value.Date);
            }

            if (toDate.HasValue)
            {
                query = query.Where(ws => ws.WorkDate <= toDate.Value.Date.AddDays(1).AddTicks(-1));
            }

            var workShifts = await query
                .OrderBy(ws => ws.WorkDate)
                .ThenBy(ws => ws.Shift!.StartTime)
                .ToListAsync();

            return Ok(_mapper.Map<List<WorkShiftDTO>>(workShifts));
        }

        [HttpGet("{id}")]
        [Authorize(Roles = "Manager, Service Staff")]
        public async Task<ActionResult<WorkShiftDTO>> GetWorkShift(int id)
        {
            var workShift = await _context.WorkShift
                .Include(ws => ws.User)
                .Include(ws => ws.Shift)
                .FirstOrDefaultAsync(ws => ws.Id == id && !ws.Deleted);

            if (workShift == null)
            {
                return NotFound("Khong tim thay phan ca nay.");
            }

            var workShiftDTO = _mapper.Map<WorkShiftDTO>(workShift);
            return Ok(workShiftDTO);
        }

        [HttpPost]
        [Authorize(Roles = "Manager")]
        public async Task<ActionResult<WorkShiftDTO>> Create([FromBody] WorkShiftRequestDTO dto)
        {
            if (dto.PenaltyAmount < 0)
            {
                return BadRequest("So tien tru khong duoc am.");
            }

            var user = await _context.User.FirstOrDefaultAsync(u => u.Id == dto.UserId && !u.Deleted);
            if (user == null)
            {
                return BadRequest("Nhan vien khong ton tai hoac da bi xoa.");
            }

            var shift = await _context.Shift.FirstOrDefaultAsync(s => s.Id == dto.ShiftId && !s.Deleted);
            if (shift == null)
            {
                return BadRequest("Ca lam viec khong ton tai hoac da bi xoa.");
            }

            var workDateOnly = dto.WorkDate.Date;

            var exists = await _context.WorkShift
                .AnyAsync(ws => ws.UserId == dto.UserId && ws.ShiftId == dto.ShiftId && ws.WorkDate == workDateOnly && !ws.Deleted);

            if (exists)
            {
                return BadRequest("Nhan vien da duoc phan ca nay trong ngay hom do.");
            }

            var workShift = _mapper.Map<WorkShift>(dto);
            workShift.WorkDate = workDateOnly;
            workShift.Note = dto.Note?.Trim();
            workShift.PenaltyAmount = dto.PenaltyAmount;
            workShift.Created = DateTime.Now;
            workShift.Updated = DateTime.Now;
            workShift.Deleted = false;

            _context.WorkShift.Add(workShift);
            await _context.SaveChangesAsync();

            await _context.Entry(workShift).Reference(ws => ws.User).LoadAsync();
            await _context.Entry(workShift).Reference(ws => ws.Shift).LoadAsync();

            var resultDTO = _mapper.Map<WorkShiftDTO>(workShift);
            return CreatedAtAction(nameof(GetWorkShift), new { id = workShift.Id }, resultDTO);
        }

        [HttpPut("{id}")]
        [Authorize(Roles = "Manager")]
        public async Task<IActionResult> Update(int id, [FromBody] WorkShiftRequestDTO dto)
        {
            if (id != dto.Id)
            {
                return BadRequest("ID khong khop.");
            }

            if (dto.PenaltyAmount < 0)
            {
                return BadRequest("So tien tru khong duoc am.");
            }

            var workShift = await _context.WorkShift
                .FirstOrDefaultAsync(ws => ws.Id == id && !ws.Deleted);

            if (workShift == null)
            {
                return NotFound("Khong tim thay phan ca lam viec can cap nhat.");
            }

            var user = await _context.User.FirstOrDefaultAsync(u => u.Id == dto.UserId && !u.Deleted);
            if (user == null)
            {
                return BadRequest("Nhan vien khong ton tai hoac da bi xoa.");
            }

            var shift = await _context.Shift.FirstOrDefaultAsync(s => s.Id == dto.ShiftId && !s.Deleted);
            if (shift == null)
            {
                return BadRequest("Ca lam viec khong ton tai hoac da bi xoa.");
            }

            var workDateOnly = dto.WorkDate.Date;

            var exists = await _context.WorkShift
                .AnyAsync(ws => ws.UserId == dto.UserId && ws.ShiftId == dto.ShiftId && ws.WorkDate == workDateOnly && ws.Id != id && !ws.Deleted);

            if (exists)
            {
                return BadRequest("Nhan vien da duoc phan ca nay trong ngay hom do.");
            }

            _mapper.Map(dto, workShift);
            workShift.WorkDate = workDateOnly;
            workShift.Note = dto.Note?.Trim();
            workShift.PenaltyAmount = dto.PenaltyAmount;
            workShift.Updated = DateTime.Now;

            await _context.SaveChangesAsync();

            await _context.Entry(workShift).Reference(ws => ws.User).LoadAsync();
            await _context.Entry(workShift).Reference(ws => ws.Shift).LoadAsync();

            return Ok(new
            {
                success = true,
                message = "Cap nhat phan ca thanh cong",
                data = _mapper.Map<WorkShiftDTO>(workShift)
            });
        }

        [HttpDelete("{id}")]
        [Authorize(Roles = "Manager")]
        public async Task<IActionResult> Delete(int id)
        {
            var workShift = await _context.WorkShift
                .FirstOrDefaultAsync(ws => ws.Id == id && !ws.Deleted);

            if (workShift == null)
            {
                return NotFound("Khong tim thay phan ca can xoa.");
            }

            workShift.Deleted = true;
            workShift.Updated = DateTime.Now;

            await _context.SaveChangesAsync();
            return NoContent();
        }
    }
}
