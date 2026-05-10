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

        public IngredientController(ApplicationDbcontext context, IMapper mapper, AiClientService aiService)
        {
            _context = context;
            _mapper = mapper;
            _aiService = aiService;
        }

        // GET: /ingredient
        [HttpGet]
        public async Task<ActionResult<IEnumerable<IngredientDTO>>> GetAll()
        {
            var ingredients = await _context.Ingredient
                .Where(i => !i.Deleted)
                .ToListAsync();
            return Ok(_mapper.Map<List<IngredientDTO>>(ingredients));
        }

        // GET: /ingredient/{id}
        [HttpGet("{id}")]
        public async Task<ActionResult<IngredientDTO>> GetById(int id)
        {
            var ingredient = await _context.Ingredient
                .FirstOrDefaultAsync(i => i.Id == id && !i.Deleted);

            if (ingredient == null)
                return NotFound();

            return Ok(_mapper.Map<IngredientDTO>(ingredient));
        }

        // POST: /ingredient
        [HttpPost]
        public async Task<ActionResult<IngredientDTO>> Create([FromBody] IngredientDTO dto)
        {
            if (string.IsNullOrWhiteSpace(dto.Name))
                return BadRequest("Tên nguyên liệu bắt buộc");

            var ingredient = new Ingredient
            {
                Name = dto.Name,
                Unit = dto.Unit,
                StockQuantity = dto.StockQuantity,
                MinStock = dto.MinStock,
                Created = DateTime.Now,
                Updated = DateTime.Now,
                Deleted = false
            };

            _context.Ingredient.Add(ingredient);
            await _context.SaveChangesAsync();

            return CreatedAtAction(nameof(GetById), new { id = ingredient.Id }, _mapper.Map<IngredientDTO>(ingredient));
        }

        // PUT: /ingredient/{id}
        [HttpPut("{id}")]
        public async Task<IActionResult> Update(int id, [FromBody] IngredientDTO dto)
        {
            if (id != dto.Id)
                return BadRequest("ID không khớp");

            var ingredient = await _context.Ingredient.FindAsync(id);
            if (ingredient == null || ingredient.Deleted)
                return NotFound();

            ingredient.Name = dto.Name;
            ingredient.Unit = dto.Unit;
            ingredient.StockQuantity = dto.StockQuantity;
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
                .Where(i => !i.Deleted && i.StockQuantity <= i.MinStock)
                .ToListAsync();

            return Ok(_mapper.Map<List<IngredientDTO>>(ingredients));
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
    }
}