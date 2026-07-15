using Microsoft.EntityFrameworkCore;
using QLNH_API.Data;
using QLNH_API.Model;

namespace QLNH_API.Services
{
    public class StatusResolver
    {
        public const string TableAvailable = "TABLE_AVAILABLE";
        public const string TableOccupied = "TABLE_OCCUPIED";
        public const string TableReserved = "TABLE_RESERVED";
        public const string OrderPaid = "ORDER_PAID";
        public const string OrderUnpaid = "ORDER_UNPAID";
        public const string OrderItemPending = "ORDER_ITEM_PENDING";
        public const string OrderItemProcessing = "ORDER_ITEM_PROCESSING";
        public const string OrderItemCompleted = "ORDER_ITEM_COMPLETED";
        public const string OrderItemCancelled = "ORDER_ITEM_CANCELLED";

        private readonly ApplicationDbcontext _context;

        public StatusResolver(ApplicationDbcontext context)
        {
            _context = context;
        }

        public async Task<int> GetIdAsync(string code)
        {
            var status = await _context.Status
                .AsNoTracking()
                .FirstOrDefaultAsync(s => !s.Deleted && s.Code == code);

            if (status == null)
            {
                throw new InvalidOperationException($"Chưa cấu hình status code '{code}'.");
            }

            return status.Id;
        }

        public async Task<Status?> GetByIdAsync(int id)
        {
            return await _context.Status
                .AsNoTracking()
                .FirstOrDefaultAsync(s => !s.Deleted && s.Id == id);
        }

        public async Task<int[]> GetIdsAsync(params string[] codes)
        {
            var statuses = await _context.Status
                .AsNoTracking()
                .Where(s => !s.Deleted && codes.Contains(s.Code))
                .Select(s => new { s.Code, s.Id })
                .ToListAsync();

            var missing = codes.Where(code => statuses.All(s => s.Code != code)).ToArray();
            if (missing.Length > 0)
            {
                throw new InvalidOperationException($"Chưa cấu hình status code: {string.Join(", ", missing)}.");
            }

            return codes.Select(code => statuses.Single(s => s.Code == code).Id).ToArray();
        }
    }
}
