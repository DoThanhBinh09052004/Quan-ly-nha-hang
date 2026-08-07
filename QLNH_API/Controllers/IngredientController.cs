using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using QLNH_API.Data;
using QLNH_API.DTO;
using QLNH_API.Model;
using AutoMapper;
using QLNH_API.Services;

namespace QLNH_API.Controllers
{
    [ApiController]
    [Route("[controller]")]
    [Authorize(Roles = "Manager")]
    public class IngredientController : ControllerBase
    {
        private readonly ApplicationDbcontext _context;
        private readonly IMapper _mapper;
        private readonly AiClientService _aiService;
        private readonly IngredientBatchService _batchService;

        public IngredientController(
            ApplicationDbcontext context,
            IMapper mapper,
            AiClientService aiService,
            IngredientBatchService batchService)
        {
            _context = context;
            _mapper = mapper;
            _aiService = aiService;
            _batchService = batchService;
        }

        // GET: /ingredient
        [HttpGet]
        public async Task<ActionResult<IEnumerable<IngredientDTO>>> GetAll()
        {
            var ingredients = await _context.Ingredient
                .AsNoTracking()
                .Include(i => i.Batches)
                .Where(i => !i.Deleted)
                .ToListAsync();
            return Ok(ingredients.Select(MapIngredient).ToList());
        }

        // GET: /ingredient/{id}
        [HttpGet("{id}")]
        public async Task<ActionResult<IngredientDTO>> GetById(int id)
        {
            var ingredient = await _context.Ingredient
                .AsNoTracking()
                .Include(i => i.Batches)
                .FirstOrDefaultAsync(i => i.Id == id && !i.Deleted);

            if (ingredient == null)
                return NotFound();

            return Ok(MapIngredient(ingredient));
        }

        // POST: /ingredient
        [HttpPost]
        public async Task<ActionResult<IngredientDTO>> Create([FromBody] CreateIngredientDTO dto)
        {
            if (string.IsNullOrWhiteSpace(dto.Name))
                return BadRequest("Tên nguyên liệu bắt buộc");
            if (string.IsNullOrWhiteSpace(dto.Unit))
                return BadRequest("Đơn vị nguyên liệu bắt buộc");
            if (dto.MinStock < 0)
                return BadRequest("Mức tồn tối thiểu không được âm");

            var ingredient = new Ingredient
            {
                Name = dto.Name.Trim(),
                Unit = dto.Unit.Trim(),
                StockQuantity = 0,
                MinStock = dto.MinStock,
                Created = DateTime.Now,
                Updated = DateTime.Now,
                Deleted = false
            };

            _context.Ingredient.Add(ingredient);
            await _context.SaveChangesAsync();

            return CreatedAtAction(nameof(GetById), new { id = ingredient.Id }, MapIngredient(ingredient));
        }

        // PUT: /ingredient/{id}
        [HttpPut("{id}")]
        public async Task<IActionResult> Update(int id, [FromBody] UpdateIngredientDTO dto)
        {
            if (id != dto.Id)
                return BadRequest("ID không khớp");
            if (string.IsNullOrWhiteSpace(dto.Name) || string.IsNullOrWhiteSpace(dto.Unit))
                return BadRequest("Tên và đơn vị nguyên liệu là bắt buộc");
            if (dto.MinStock < 0)
                return BadRequest("Mức tồn tối thiểu không được âm");

            var ingredient = await _context.Ingredient.FindAsync(id);
            if (ingredient == null || ingredient.Deleted)
                return NotFound();

            ingredient.Name = dto.Name.Trim();
            ingredient.Unit = dto.Unit.Trim();
            ingredient.MinStock = dto.MinStock;
            ingredient.Updated = DateTime.Now;

            await _context.SaveChangesAsync();
            return NoContent();
        }

        // DELETE: /ingredient/{id}
        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(int id)
        {
            var ingredient = await _context.Ingredient.FindAsync(id);
            if (ingredient == null || ingredient.Deleted)
                return NotFound();

            var hasStock = await _context.IngredientBatch.AnyAsync(b =>
                b.IngredientId == id && !b.Deleted && b.RemainingQuantity > 0.000001d);
            if (hasStock)
                return Conflict("Không thể xóa nguyên liệu khi vẫn còn tồn trong các lô");

            var isUsedInRecipe = await _context.Recipe.AnyAsync(r => r.IngredientId == id);
            if (isUsedInRecipe)
                return Conflict("Không thể xóa nguyên liệu đang được sử dụng trong công thức");

            ingredient.Deleted = true;
            ingredient.Updated = DateTime.Now;
            await _context.SaveChangesAsync();

            return NoContent();
        }

        // GET: /ingredient/low-stock
        [HttpGet("low-stock")]
        public async Task<ActionResult<IEnumerable<IngredientDTO>>> GetLowStock()
        {
            var ingredients = await _context.Ingredient
                .AsNoTracking()
                .Include(i => i.Batches)
                .Where(i => !i.Deleted)
                .ToListAsync();

            return Ok(ingredients
                .Select(MapIngredient)
                .Where(i => i.StockQuantity <= i.MinStock)
                .ToList());
        }

        // GET: /ingredient/{id}/batches
        [HttpGet("{id}/batches")]
        public async Task<ActionResult<IEnumerable<IngredientBatchDTO>>> GetBatches(
            int id,
            [FromQuery] bool includeDepleted = true)
        {
            var ingredientExists = await _context.Ingredient.AnyAsync(i => i.Id == id && !i.Deleted);
            if (!ingredientExists)
                return NotFound("Không tìm thấy nguyên liệu");

            var batches = await _batchService.GetByIngredientAsync(id, includeDepleted);
            return Ok(batches.Select(MapBatch).ToList());
        }

        // POST: /ingredient/{id}/batches
        [HttpPost("{id}/batches")]
        public async Task<ActionResult<IngredientBatchDTO>> CreateBatch(
            int id,
            [FromBody] CreateIngredientBatchDTO dto)
        {
            try
            {
                var batch = await _batchService.CreateAsync(id, dto);
                return CreatedAtAction(nameof(GetBatches), new { id }, MapBatch(batch));
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(ex.Message);
            }
            catch (IngredientBatchException ex)
            {
                return BadRequest(ex.Message);
            }
        }

        // PUT: /ingredient/{ingredientId}/batches/{batchId}
        [HttpPut("{ingredientId}/batches/{batchId}")]
        public async Task<ActionResult<IngredientBatchDTO>> UpdateBatch(
            int ingredientId,
            int batchId,
            [FromBody] UpdateIngredientBatchDTO dto)
        {
            try
            {
                var batch = await _batchService.UpdateAsync(ingredientId, batchId, dto);
                return Ok(MapBatch(batch));
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(ex.Message);
            }
            catch (IngredientBatchException ex)
            {
                return BadRequest(ex.Message);
            }
        }

        // DELETE: /ingredient/{ingredientId}/batches/{batchId}
        [HttpDelete("{ingredientId}/batches/{batchId}")]
        public async Task<IActionResult> DeleteBatch(int ingredientId, int batchId)
        {
            try
            {
                await _batchService.DeleteAsync(ingredientId, batchId);
                return NoContent();
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(ex.Message);
            }
            catch (IngredientBatchException ex)
            {
                return Conflict(ex.Message);
            }
        }

        // GET: /ingredient/{id}/recipes
        [HttpGet("{id}/recipes")]
        public async Task<ActionResult> GetRecipesByIngredient(int id)
        {
            var recipes = await _context.Recipe
                .Include(r => r.Item)
                .Where(r => r.IngredientId == id)
                .Select(r => new
                {
                    RecipeId = r.Id,
                    ItemId = r.ItemId,
                    ItemName = r.Item != null ? r.Item.Name : "",
                    QuantityNeeded = r.QuantityNeeded
                })
                .ToListAsync();

            return Ok(recipes);
        }

        // ---------------- AI endpoints (similar to GuestController) ----------------

        // GET: /ingredient/ai-restock?days=14
        [HttpGet("ai-restock")]
        public async Task<IActionResult> GetAiRestock([FromQuery] int days = 14, CancellationToken cancellationToken = default)
        {
            try
            {
                days = Math.Clamp(days, 1, 90);
                var result = await _aiService.GetIngredientRestockForecastAsync(days, cancellationToken);
                return Ok(result);
            }
            catch (HttpRequestException)
            {
                // fallback: trả rỗng giống kiểu GuestController fallback cluster=-1
                return Ok(new List<AiIngredientRestockRowDto>());
            }
            catch
            {
                return Ok(new List<AiIngredientRestockRowDto>());
            }
        }

        // GET: /ingredient/{id}/ai-forecast?days=14
        [HttpGet("{id}/ai-forecast")]
        public async Task<IActionResult> GetAiForecastByIngredient(int id, [FromQuery] int days = 14, CancellationToken cancellationToken = default)
        {
            try
            {
                days = Math.Clamp(days, 1, 90);
                // optional: check ingredient exists to avoid calling AI with invalid id
                var ingredient = await _context.Ingredient.FirstOrDefaultAsync(i => i.Id == id && !i.Deleted, cancellationToken);
                if (ingredient == null)
                    return NotFound("Ingredient not found");

                var result = await _aiService.GetIngredientDailyForecastAsync(id, days, cancellationToken);
                return Ok(result);
            }
            catch (HttpRequestException)
            {
                return Ok(new List<AiIngredientDailyForecastRowDto>());
            }
            catch
            {
                return Ok(new List<AiIngredientDailyForecastRowDto>());
            }
        }

        private IngredientDTO MapIngredient(Ingredient ingredient)
        {
            var today = DateTime.Today;
            var expiringThreshold = today.AddDays(7);
            var usableBatches = ingredient.Batches
                .Where(b => !b.Deleted && b.RemainingQuantity > 0.000001d && b.ExpirationDate >= today)
                .ToList();

            var dto = _mapper.Map<IngredientDTO>(ingredient);
            dto.StockQuantity = usableBatches.Sum(b => b.RemainingQuantity);
            dto.BatchCount = usableBatches.Count;
            dto.ExpiringSoonBatchCount = usableBatches.Count(b => b.ExpirationDate <= expiringThreshold);
            dto.EarliestExpirationDate = usableBatches.Count == 0
                ? null
                : usableBatches.Min(b => b.ExpirationDate);
            return dto;
        }

        private IngredientBatchDTO MapBatch(IngredientBatch batch)
        {
            var dto = _mapper.Map<IngredientBatchDTO>(batch);
            dto.IsExpired = batch.ExpirationDate < DateTime.Today;
            dto.IsExpiringSoon = !dto.IsExpired && batch.ExpirationDate <= DateTime.Today.AddDays(7);
            return dto;
        }
    }
}
