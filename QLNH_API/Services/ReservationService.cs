using AutoMapper;
using Microsoft.EntityFrameworkCore;
using QLNH_API.Data;
using QLNH_API.DTO.Reservation;
using QLNH_API.Model;

namespace QLNH_API.Services
{
    public class ReservationService
    {
        private readonly ApplicationDbcontext _context;
        private readonly IMapper _mapper;
        private readonly StatusResolver _statusResolver;

        private static readonly HashSet<string> BlockingStatuses = new(StringComparer.OrdinalIgnoreCase)
        {
            ReservationStatuses.Pending,
            ReservationStatuses.Confirmed,
            ReservationStatuses.Arrived
        };

        public ReservationService(ApplicationDbcontext context, IMapper mapper, StatusResolver statusResolver)
        {
            _context = context;
            _mapper = mapper;
            _statusResolver = statusResolver;
        }

        public async Task<List<ReservationDTO>> GetAsync(DateTime? date = null, int? tableId = null)
        {
            var query = _context.Reservation
                .AsNoTracking()
                .Include(r => r.GuestTable)
                .Where(r => !r.Deleted);

            if (date.HasValue)
            {
                var from = date.Value.Date;
                var to = from.AddDays(1);
                query = query.Where(r => r.ReservationTime < to &&
                    r.ReservationTime.AddMinutes(r.DurationMinutes) > from);
            }

            if (tableId.HasValue)
            {
                query = query.Where(r => r.GuestTableId == tableId.Value);
            }

            var reservations = await query.OrderBy(r => r.ReservationTime).ToListAsync();
            return _mapper.Map<List<ReservationDTO>>(reservations);
        }

        public async Task<ReservationDTO?> GetByIdAsync(int id)
        {
            var reservation = await _context.Reservation
                .AsNoTracking()
                .Include(r => r.GuestTable)
                .FirstOrDefaultAsync(r => r.Id == id && !r.Deleted);

            return reservation == null ? null : _mapper.Map<ReservationDTO>(reservation);
        }

        public async Task<ReservationDTO> CreateAsync(CreateReservationDTO dto)
        {
            var table = await _context.GuestTable
                .FirstOrDefaultAsync(t => t.Id == dto.GuestTableId && !t.Deleted);

            ValidateTable(table, dto.PartySize);
            await EnsureNoConflictAsync(dto.GuestTableId, dto.ReservationTime, dto.DurationMinutes, null);

            if (dto.GuestId.HasValue && !await _context.Guest.AnyAsync(g => g.Id == dto.GuestId && !g.Deleted))
            {
                throw new InvalidOperationException("Khách hàng không tồn tại.");
            }

            var reservation = new Reservation
            {
                GuestTableId = dto.GuestTableId,
                GuestId = dto.GuestId,
                GuestName = dto.GuestName.Trim(),
                Phone = dto.Phone.Trim(),
                PartySize = dto.PartySize,
                ReservationTime = dto.ReservationTime,
                DurationMinutes = dto.DurationMinutes,
                Note = dto.Note,
                Status = ReservationStatuses.Pending
            };

            _context.Reservation.Add(reservation);
            await _context.SaveChangesAsync();
            return (await GetByIdAsync(reservation.Id))!;
        }

        public async Task<ReservationDTO?> UpdateAsync(int id, UpdateReservationDTO dto)
        {
            var reservation = await _context.Reservation
                .FirstOrDefaultAsync(r => r.Id == id && !r.Deleted);
            if (reservation == null) return null;

            var previousTableId = reservation.GuestTableId;

            var table = await _context.GuestTable
                .FirstOrDefaultAsync(t => t.Id == dto.GuestTableId && !t.Deleted);
            ValidateTable(table, dto.PartySize);
            await EnsureNoConflictAsync(dto.GuestTableId, dto.ReservationTime, dto.DurationMinutes, id);

            reservation.GuestTableId = dto.GuestTableId;
            reservation.GuestId = dto.GuestId;
            reservation.GuestName = dto.GuestName.Trim();
            reservation.Phone = dto.Phone.Trim();
            reservation.PartySize = dto.PartySize;
            reservation.ReservationTime = dto.ReservationTime;
            reservation.DurationMinutes = dto.DurationMinutes;
            reservation.Note = dto.Note;
            reservation.Updated = DateTime.Now;

            await _context.SaveChangesAsync();
            await RefreshTableStatusAsync(previousTableId);
            if (reservation.GuestTableId != previousTableId)
            {
                await RefreshTableStatusAsync(reservation.GuestTableId);
            }

            return await GetByIdAsync(id);
        }

        public async Task<ReservationDTO?> ChangeStatusAsync(int id, string status)
        {
            var validStatuses = new[]
            {
                ReservationStatuses.Pending, ReservationStatuses.Confirmed,
                ReservationStatuses.Arrived, ReservationStatuses.Completed,
                ReservationStatuses.Cancelled, ReservationStatuses.NoShow
            };

            if (!validStatuses.Contains(status, StringComparer.OrdinalIgnoreCase))
            {
                throw new InvalidOperationException("Trạng thái đặt bàn không hợp lệ.");
            }

            var reservation = await _context.Reservation
                .FirstOrDefaultAsync(r => r.Id == id && !r.Deleted);
            if (reservation == null) return null;

            if (status.Equals(ReservationStatuses.Confirmed, StringComparison.OrdinalIgnoreCase))
            {
                await EnsureNoConflictAsync(reservation.GuestTableId, reservation.ReservationTime,
                    reservation.DurationMinutes, reservation.Id);
            }

            reservation.Status = validStatuses.First(s => s.Equals(status, StringComparison.OrdinalIgnoreCase));
            reservation.Updated = DateTime.Now;
            await _context.SaveChangesAsync();
            await RefreshTableStatusAsync(reservation.GuestTableId);

            return await GetByIdAsync(id);
        }

        private async Task EnsureNoConflictAsync(int tableId, DateTime start, int durationMinutes, int? excludedId)
        {
            var end = start.AddMinutes(durationMinutes);
            var query = _context.Reservation.Where(r =>
                !r.Deleted && BlockingStatuses.Contains(r.Status) && r.GuestTableId == tableId &&
                (!excludedId.HasValue || r.Id != excludedId.Value));

            var conflicts = await query.AnyAsync(r =>
                r.ReservationTime < end && r.ReservationTime.AddMinutes(r.DurationMinutes) > start);

            if (conflicts)
            {
                throw new InvalidOperationException("Bàn đã có lịch đặt trong khoảng thời gian này.");
            }
        }

        private static void ValidateTable(GuestTable? table, int partySize)
        {
            if (table == null) throw new InvalidOperationException("Không tìm thấy bàn.");
            if (partySize > table.Capacity)
            {
                throw new InvalidOperationException("Số người vượt quá sức chứa của bàn.");
            }
        }

        public async Task RefreshTableStatusAsync(int tableId)
        {
            var table = await _context.GuestTable
                .Include(t => t.Orders)
                .FirstOrDefaultAsync(t => t.Id == tableId && !t.Deleted);
            if (table == null) return;

            var statusCode = await ResolveTableStatusAsync(table);

            table.StatusId = await _statusResolver.GetIdAsync(statusCode);
            table.Updated = DateTime.Now;
            await _context.SaveChangesAsync();
        }

        private async Task<string> ResolveTableStatusAsync(GuestTable table)
        {
            var hasUnpaidOrder = table.Orders?.Any(o => !o.Deleted && !o.Voided && o.PaidAmount < o.FinalPrice) == true;
            if (hasUnpaidOrder)
            {
                return StatusResolver.TableOccupied;
            }

            var now = DateTime.Now;
            var hasCurrentArrivedReservation = await _context.Reservation.AnyAsync(r =>
                !r.Deleted && r.GuestTableId == table.Id && r.Status == ReservationStatuses.Arrived &&
                r.ReservationTime <= now && r.ReservationTime.AddMinutes(r.DurationMinutes) > now);
            if (hasCurrentArrivedReservation)
            {
                return StatusResolver.TableOccupied;
            }

            var hasUpcomingConfirmedReservation = await _context.Reservation.AnyAsync(r =>
                !r.Deleted && r.GuestTableId == table.Id && r.Status == ReservationStatuses.Confirmed &&
                r.ReservationTime.AddMinutes(r.DurationMinutes) > now);
            return hasUpcomingConfirmedReservation ? StatusResolver.TableReserved : StatusResolver.TableAvailable;
        }

    }
}
