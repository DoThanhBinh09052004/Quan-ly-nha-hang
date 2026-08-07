using Microsoft.EntityFrameworkCore;
using QLNH_API.Data;
using QLNH_API.DTO;
using QLNH_API.Model;

namespace QLNH_API.Services
{
    public sealed class IngredientBatchException : Exception
    {
        public IngredientBatchException(string message) : base(message)
        {
        }
    }

    public class IngredientBatchService
    {
        private const double QuantityTolerance = 0.000001d;
        private readonly ApplicationDbcontext _context;

        public IngredientBatchService(ApplicationDbcontext context)
        {
            _context = context;
        }

        public async Task<List<IngredientBatch>> GetByIngredientAsync(int ingredientId, bool includeDepleted)
        {
            var query = _context.IngredientBatch
                .AsNoTracking()
                .Where(b => b.IngredientId == ingredientId && !b.Deleted);

            if (!includeDepleted)
                query = query.Where(b => b.RemainingQuantity > QuantityTolerance);

            return await query
                .OrderBy(b => b.ExpirationDate)
                .ThenBy(b => b.ReceivedDate)
                .ThenBy(b => b.Id)
                .ToListAsync();
        }

        public async Task<IngredientBatch> CreateAsync(int ingredientId, CreateIngredientBatchDTO dto)
        {
            ValidateBatchValues(dto.ReceivedDate, dto.ExpirationDate, dto.UnitCost, dto.Quantity);

            var ingredient = await _context.Ingredient
                .FirstOrDefaultAsync(i => i.Id == ingredientId && !i.Deleted)
                ?? throw new KeyNotFoundException("Không tìm thấy nguyên liệu");

            var batchCode = string.IsNullOrWhiteSpace(dto.BatchCode)
                ? $"LO-{dto.ReceivedDate:yyyyMMdd}-{Guid.NewGuid():N}"[..20].ToUpperInvariant()
                : dto.BatchCode.Trim();

            if (batchCode.Length > 50)
                throw new IngredientBatchException("Mã lô không được vượt quá 50 ký tự");

            var duplicatedCode = await _context.IngredientBatch.AnyAsync(b =>
                b.IngredientId == ingredientId && b.BatchCode == batchCode);
            if (duplicatedCode)
                throw new IngredientBatchException("Mã lô đã tồn tại cho nguyên liệu này");

            var now = DateTime.Now;
            var batch = new IngredientBatch
            {
                IngredientId = ingredientId,
                BatchCode = batchCode,
                ReceivedDate = dto.ReceivedDate.Date,
                ExpirationDate = dto.ExpirationDate.Date,
                UnitCost = dto.UnitCost,
                ReceivedQuantity = dto.Quantity,
                RemainingQuantity = dto.Quantity,
                Created = now,
                Updated = now
            };

            ingredient.StockQuantity += dto.Quantity;
            ingredient.Updated = now;
            _context.IngredientBatch.Add(batch);
            await _context.SaveChangesAsync();
            return batch;
        }

        public async Task<IngredientBatch> UpdateAsync(int ingredientId, int batchId, UpdateIngredientBatchDTO dto)
        {
            if (batchId != dto.Id)
                throw new IngredientBatchException("ID lô không khớp");

            ValidateBatchValues(dto.ReceivedDate, dto.ExpirationDate, dto.UnitCost, dto.ReceivedQuantity);

            var batch = await _context.IngredientBatch
                .Include(b => b.Ingredient)
                .Include(b => b.Allocations)
                .FirstOrDefaultAsync(b => b.Id == batchId && b.IngredientId == ingredientId && !b.Deleted)
                ?? throw new KeyNotFoundException("Không tìm thấy lô nguyên liệu");

            var consumedOrReserved = batch.ReceivedQuantity - batch.RemainingQuantity;
            if (dto.ReceivedQuantity + QuantityTolerance < consumedOrReserved)
                throw new IngredientBatchException("Số lượng nhập không thể nhỏ hơn số lượng đã giữ hoặc đã sử dụng");

            if (batch.Allocations.Any() && dto.UnitCost != batch.UnitCost)
                throw new IngredientBatchException("Không thể đổi giá nhập của lô đã được dùng trong đơn hàng");

            var batchCode = string.IsNullOrWhiteSpace(dto.BatchCode) ? batch.BatchCode : dto.BatchCode.Trim();
            if (batchCode.Length > 50)
                throw new IngredientBatchException("Mã lô không được vượt quá 50 ký tự");

            var duplicatedCode = await _context.IngredientBatch.AnyAsync(b =>
                b.Id != batchId && b.IngredientId == ingredientId && b.BatchCode == batchCode);
            if (duplicatedCode)
                throw new IngredientBatchException("Mã lô đã tồn tại cho nguyên liệu này");

            var wasUsable = batch.ExpirationDate >= DateTime.Today;
            var willBeUsable = dto.ExpirationDate.Date >= DateTime.Today;
            var oldRemaining = batch.RemainingQuantity;
            var newRemaining = dto.ReceivedQuantity - consumedOrReserved;

            if (wasUsable)
                batch.Ingredient!.StockQuantity -= oldRemaining;
            if (willBeUsable)
                batch.Ingredient!.StockQuantity += newRemaining;
            batch.Ingredient!.StockQuantity = Math.Max(0, batch.Ingredient.StockQuantity);

            batch.BatchCode = batchCode;
            batch.ReceivedDate = dto.ReceivedDate.Date;
            batch.ExpirationDate = dto.ExpirationDate.Date;
            batch.UnitCost = dto.UnitCost;
            batch.ReceivedQuantity = dto.ReceivedQuantity;
            batch.RemainingQuantity = newRemaining;
            batch.Updated = DateTime.Now;
            batch.Ingredient!.Updated = DateTime.Now;

            await _context.SaveChangesAsync();
            return batch;
        }

        public async Task DeleteAsync(int ingredientId, int batchId)
        {
            var batch = await _context.IngredientBatch
                .Include(b => b.Ingredient)
                .Include(b => b.Allocations)
                .FirstOrDefaultAsync(b => b.Id == batchId && b.IngredientId == ingredientId && !b.Deleted)
                ?? throw new KeyNotFoundException("Không tìm thấy lô nguyên liệu");

            if (batch.Allocations.Any() || Math.Abs(batch.ReceivedQuantity - batch.RemainingQuantity) > QuantityTolerance)
                throw new IngredientBatchException("Không thể xóa lô đã được giữ hoặc sử dụng trong đơn hàng");

            if (batch.ExpirationDate >= DateTime.Today)
                batch.Ingredient!.StockQuantity -= batch.RemainingQuantity;
            batch.Ingredient!.StockQuantity = Math.Max(0, batch.Ingredient.StockQuantity);

            batch.Deleted = true;
            batch.RemainingQuantity = 0;
            batch.Updated = DateTime.Now;
            batch.Ingredient!.Updated = DateTime.Now;
            await _context.SaveChangesAsync();
        }

        private static void ValidateBatchValues(
            DateTime receivedDate,
            DateTime expirationDate,
            decimal unitCost,
            double quantity)
        {
            if (receivedDate == default || expirationDate == default)
                throw new IngredientBatchException("Ngày nhập và hạn sử dụng là bắt buộc");
            if (receivedDate.Date > DateTime.Today)
                throw new IngredientBatchException("Ngày nhập không được nằm trong tương lai");
            if (expirationDate.Date < DateTime.Today)
                throw new IngredientBatchException("Không thể nhập lô đã hết hạn");
            if (expirationDate.Date <= receivedDate.Date)
                throw new IngredientBatchException("Hạn sử dụng phải sau ngày nhập");
            if (unitCost < 0)
                throw new IngredientBatchException("Giá nhập không được âm");
            if (quantity <= QuantityTolerance)
                throw new IngredientBatchException("Số lượng nhập phải lớn hơn 0");
        }
    }
}
