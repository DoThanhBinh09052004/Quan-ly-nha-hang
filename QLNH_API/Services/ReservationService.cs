using AutoMapper;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using QLNH_API.Data;
using QLNH_API.DTO;
using QLNH_API.DTO.Reservation;
using QLNH_API.Model;

namespace QLNH_API.Services
{
    public class ReservationService
    {
        private readonly ApplicationDbcontext _context;
        private readonly IMapper _mapper;
        private readonly StatusResolver _statusResolver;
        private readonly ReservationPolicyOptions _policy;

        private static readonly HashSet<string> BlockingStatuses = new(StringComparer.OrdinalIgnoreCase)
        {
            ReservationStatuses.Pending,
            ReservationStatuses.Confirmed,
            ReservationStatuses.Arrived
        };

        public ReservationService(
            ApplicationDbcontext context,
            IMapper mapper,
            StatusResolver statusResolver,
            IOptions<ReservationPolicyOptions> policy)
        {
            _context = context;
            _mapper = mapper;
            _statusResolver = statusResolver;
            _policy = policy.Value;
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

        public async Task<List<GuestTableDTO>> GetTablesAvailableForReservationAsync(
            DateTime start,
            int durationMinutes,
            int partySize,
            int? excludedReservationId = null)
        {
            var end = start.AddMinutes(durationMinutes);
            var conflictingTableIds = await _context.Reservation
                .AsNoTracking()
                .Where(r => !r.Deleted && BlockingStatuses.Contains(r.Status) &&
                    (!excludedReservationId.HasValue || r.Id != excludedReservationId.Value) &&
                    r.ReservationTime < end &&
                    r.ReservationTime.AddMinutes(r.DurationMinutes) > start)
                .Select(r => r.GuestTableId)
                .Distinct()
                .ToListAsync();

            var tables = await _context.GuestTable
                .AsNoTracking()
                .Include(t => t.Status)
                .Where(t => !t.Deleted && t.Capacity >= partySize && !conflictingTableIds.Contains(t.Id))
                .OrderBy(t => t.Floor)
                .ThenBy(t => t.Name)
                .ToListAsync();

            return _mapper.Map<List<GuestTableDTO>>(tables);
        }

        public async Task<List<GuestTableDTO>> GetOrderAvailableTablesAsync(DateTime? at = null)
        {
            var now = at ?? DateTime.Now;
            var tableStatuses = await _context.Status
                .AsNoTracking()
                .Where(s => !s.Deleted && s.Type == "TABLE")
                .ToDictionaryAsync(s => s.Code);

            var unpaidStatusId = await _statusResolver.GetIdAsync(StatusResolver.OrderUnpaid);
            var tables = await _context.GuestTable
                .AsNoTracking()
                .Include(t => t.Status)
                .Include(t => t.Guest)
                .Include(t => t.Orders!)
                    .ThenInclude(o => o.Guest)
                .Where(t => !t.Deleted)
                .ToListAsync();

            var tableIds = tables.Select(t => t.Id).ToArray();
            var reservations = await _context.Reservation
                .AsNoTracking()
                .Where(r => !r.Deleted && tableIds.Contains(r.GuestTableId) &&
                    (r.Status == ReservationStatuses.Confirmed || r.Status == ReservationStatuses.Arrived))
                .ToListAsync();

            var result = new List<GuestTableDTO>();
            foreach (var table in tables)
            {
                var effectiveCode = ResolveEffectiveStatusCode(
                    table,
                    reservations.Where(r => r.GuestTableId == table.Id),
                    unpaidStatusId,
                    now);

                if (effectiveCode != StatusResolver.TableAvailable)
                {
                    continue;
                }

                table.Status = tableStatuses[effectiveCode];
                table.StatusId = table.Status.Id;
                result.Add(_mapper.Map<GuestTableDTO>(table));
            }

            return result;
        }

        public async Task ApplyEffectiveStatusesAsync(IReadOnlyCollection<GuestTable> tables, DateTime? at = null)
        {
            if (tables.Count == 0) return;

            var now = at ?? DateTime.Now;
            var unpaidStatusId = await _statusResolver.GetIdAsync(StatusResolver.OrderUnpaid);
            var statuses = await _context.Status
                .AsNoTracking()
                .Where(s => !s.Deleted && s.Type == "TABLE")
                .ToDictionaryAsync(s => s.Code);

            var tableIds = tables.Select(t => t.Id).ToArray();
            var reservations = await _context.Reservation
                .AsNoTracking()
                .Where(r => !r.Deleted && tableIds.Contains(r.GuestTableId) &&
                    (r.Status == ReservationStatuses.Confirmed || r.Status == ReservationStatuses.Arrived))
                .ToListAsync();

            foreach (var table in tables)
            {
                var code = ResolveEffectiveStatusCode(
                    table,
                    reservations.Where(r => r.GuestTableId == table.Id),
                    unpaidStatusId,
                    now);
                table.Status = statuses[code];
                table.StatusId = table.Status.Id;
            }
        }

        public async Task<GuestTable> LockTableAsync(int tableId)
        {
            var tables = await _context.GuestTable
                .FromSqlInterpolated($"SELECT * FROM `guesttable` WHERE `Id` = {tableId} FOR UPDATE")
                .AsTracking()
                .ToListAsync();
            var table = tables.FirstOrDefault(t => !t.Deleted);

            if (table != null)
            {
                await _context.Entry(table).Reference(t => t.Status).LoadAsync();
            }

            return table ?? throw new TableAvailabilityException(
                "TABLE_NOT_FOUND", "Không tìm thấy bàn ăn.");
        }

        public async Task<Reservation?> EnsureTableCanAcceptOrderAsync(
            GuestTable table,
            int? reservationId,
            int? excludedOrderId = null,
            DateTime? at = null)
        {
            var now = at ?? DateTime.Now;
            var unpaidStatusId = await _statusResolver.GetIdAsync(StatusResolver.OrderUnpaid);
            var hasActiveOrder = await _context.Order.AnyAsync(o =>
                !o.Deleted && !o.Voided && o.GuestTableId == table.Id &&
                o.StatusId == unpaidStatusId && (!excludedOrderId.HasValue || o.Id != excludedOrderId.Value));

            if (hasActiveOrder)
            {
                throw new TableAvailabilityException(
                    "TABLE_OCCUPIED", "Bàn đang có đơn hàng hoạt động. Vui lòng chọn bàn khác.");
            }

            if (reservationId.HasValue)
            {
                var reservation = await _context.Reservation
                    .Include(r => r.Order)
                    .FirstOrDefaultAsync(r => r.Id == reservationId.Value && !r.Deleted);

                if (reservation == null)
                {
                    throw new TableAvailabilityException(
                        "RESERVATION_NOT_FOUND", "Không tìm thấy lịch đặt bàn.");
                }
                if (reservation.GuestTableId != table.Id)
                {
                    throw new TableAvailabilityException(
                        "RESERVATION_TABLE_MISMATCH", "Bàn được chọn không khớp với lịch đặt.");
                }
                if (reservation.Status != ReservationStatuses.Confirmed)
                {
                    throw new TableAvailabilityException(
                        "RESERVATION_NOT_CONFIRMED", "Lịch đặt bàn không còn ở trạng thái đã xác nhận.");
                }
                if (reservation.Order != null && reservation.Order.Id != excludedOrderId)
                {
                    throw new TableAvailabilityException(
                        "RESERVATION_ALREADY_CHECKED_IN", "Lịch đặt bàn đã được tạo đơn hàng.");
                }

                var holdStart = reservation.ReservationTime.AddMinutes(-_policy.LockBeforeMinutes);
                var graceEnd = reservation.ReservationTime.AddMinutes(_policy.LateArrivalGraceMinutes);
                if (now < holdStart)
                {
                    throw new TableAvailabilityException(
                        "RESERVATION_TOO_EARLY", $"Chỉ có thể nhận bàn từ {holdStart:HH:mm dd/MM/yyyy}.", reservation.ReservationTime);
                }
                if (now > graceEnd)
                {
                    throw new TableAvailabilityException(
                        "RESERVATION_EXPIRED", "Lịch đặt đã quá thời gian chờ khách đến.", reservation.ReservationTime);
                }
                if (table.StatusManuallyOverridden && table.Status?.Code == StatusResolver.TableOccupied)
                {
                    throw new TableAvailabilityException(
                        "TABLE_OCCUPIED", "Bàn đang được đặt trạng thái thủ công là đang phục vụ.");
                }

                return reservation;
            }

            if (table.StatusManuallyOverridden)
            {
                if (table.Status?.Code == StatusResolver.TableAvailable)
                {
                    return null;
                }

                throw new TableAvailabilityException(
                    table.Status?.Code == StatusResolver.TableOccupied ? "TABLE_OCCUPIED" : "TABLE_RESERVATION_LOCKED",
                    $"Bàn đang được đặt trạng thái thủ công là {table.Status?.Name ?? "không khả dụng"}.");
            }

            var blockingReservation = await _context.Reservation
                .AsNoTracking()
                .Where(r => !r.Deleted && r.GuestTableId == table.Id && r.Status == ReservationStatuses.Confirmed &&
                    now >= r.ReservationTime.AddMinutes(-_policy.LockBeforeMinutes) &&
                    now <= r.ReservationTime.AddMinutes(_policy.LateArrivalGraceMinutes))
                .OrderBy(r => r.ReservationTime)
                .FirstOrDefaultAsync();

            if (blockingReservation != null)
            {
                throw new TableAvailabilityException(
                    "TABLE_RESERVATION_LOCKED",
                    $"Bàn đã được giữ cho lịch đặt lúc {blockingReservation.ReservationTime:HH:mm}. Vui lòng chọn bàn khác.",
                    blockingReservation.ReservationTime);
            }

            var hasArrivedReservation = await _context.Reservation.AnyAsync(r =>
                !r.Deleted && r.GuestTableId == table.Id && r.Status == ReservationStatuses.Arrived);
            if (hasArrivedReservation)
            {
                throw new TableAvailabilityException(
                    "TABLE_OCCUPIED", "Khách đặt bàn đã đến và bàn đang được sử dụng.");
            }

            return null;
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

            if (reservation.Status == ReservationStatuses.Arrived ||
                reservation.Status == ReservationStatuses.Completed)
            {
                throw new InvalidOperationException("Không thể sửa lịch đặt sau khi khách đã nhận bàn.");
            }

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

            if (status.Equals(ReservationStatuses.Arrived, StringComparison.OrdinalIgnoreCase))
            {
                throw new InvalidOperationException("Hãy dùng thao tác nhận bàn và tạo đơn để ghi nhận khách đã đến.");
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

        public async Task TransferReservationAsync(Reservation reservation, int newTableId)
        {
            if (reservation.GuestTableId == newTableId) return;

            var table = await _context.GuestTable.FirstOrDefaultAsync(t => t.Id == newTableId && !t.Deleted);
            ValidateTable(table, reservation.PartySize);
            await EnsureNoConflictAsync(newTableId, reservation.ReservationTime, reservation.DurationMinutes, reservation.Id);
            reservation.GuestTableId = newTableId;
            reservation.Updated = DateTime.Now;
        }

        public void MarkArrived(Reservation reservation)
        {
            reservation.Status = ReservationStatuses.Arrived;
            reservation.Updated = DateTime.Now;
        }

        public async Task MarkCompletedAsync(int reservationId)
        {
            var reservation = await _context.Reservation
                .FirstOrDefaultAsync(r => r.Id == reservationId && !r.Deleted);
            if (reservation == null || reservation.Status != ReservationStatuses.Arrived) return;

            reservation.Status = ReservationStatuses.Completed;
            reservation.Updated = DateTime.Now;
        }

        public async Task MarkCancelledAfterOrderDeletionAsync(int reservationId)
        {
            var reservation = await _context.Reservation
                .FirstOrDefaultAsync(r => r.Id == reservationId && !r.Deleted);
            if (reservation == null || reservation.Status != ReservationStatuses.Arrived) return;

            reservation.Status = ReservationStatuses.Cancelled;
            reservation.Updated = DateTime.Now;
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
                .Include(t => t.Status)
                .Include(t => t.Orders)
                .FirstOrDefaultAsync(t => t.Id == tableId && !t.Deleted);
            if (table == null || table.StatusManuallyOverridden) return;

            var unpaidStatusId = await _statusResolver.GetIdAsync(StatusResolver.OrderUnpaid);
            var reservations = await _context.Reservation
                .Where(r => !r.Deleted && r.GuestTableId == tableId &&
                    (r.Status == ReservationStatuses.Confirmed || r.Status == ReservationStatuses.Arrived))
                .ToListAsync();
            var statusCode = ResolveEffectiveStatusCode(table, reservations, unpaidStatusId, DateTime.Now);

            table.StatusId = await _statusResolver.GetIdAsync(statusCode);
            table.Updated = DateTime.Now;
            await _context.SaveChangesAsync();
        }

        private string ResolveEffectiveStatusCode(
            GuestTable table,
            IEnumerable<Reservation> reservations,
            int unpaidStatusId,
            DateTime now)
        {
            var hasActiveOrder = table.Orders?.Any(o =>
                !o.Deleted && !o.Voided && o.StatusId == unpaidStatusId) == true;
            if (hasActiveOrder)
            {
                return StatusResolver.TableOccupied;
            }

            if (table.StatusManuallyOverridden && table.Status != null)
            {
                return table.Status.Code;
            }

            if (reservations.Any(r => r.Status == ReservationStatuses.Arrived))
            {
                return StatusResolver.TableOccupied;
            }

            var hasReservationHold = reservations.Any(r =>
                r.Status == ReservationStatuses.Confirmed &&
                now >= r.ReservationTime.AddMinutes(-_policy.LockBeforeMinutes) &&
                now <= r.ReservationTime.AddMinutes(_policy.LateArrivalGraceMinutes));

            return hasReservationHold ? StatusResolver.TableReserved : StatusResolver.TableAvailable;
        }
    }

    public sealed class TableAvailabilityException : InvalidOperationException
    {
        public TableAvailabilityException(string code, string message, DateTime? reservationTime = null)
            : base(message)
        {
            Code = code;
            ReservationTime = reservationTime;
        }

        public string Code { get; }
        public DateTime? ReservationTime { get; }
    }
}
