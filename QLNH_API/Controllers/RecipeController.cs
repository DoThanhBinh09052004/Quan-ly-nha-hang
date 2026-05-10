using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using QLNH_API.Data;
using QLNH_API.DTO;
using QLNH_API.Model;
using AutoMapper;

namespace QLNH_API.Controllers
{
    [ApiController]
    [Route("[controller]")]
    [Authorize(Roles = "Manager")]
    public class RecipeController : ControllerBase
    {
        private readonly ApplicationDbcontext _context;
        private readonly IMapper _mapper;

        public RecipeController(ApplicationDbcontext context, IMapper mapper)
        {
            _context = context;
            _mapper = mapper;
        }

        // GET: /recipe
        [HttpGet]
        public async Task<ActionResult<IEnumerable<RecipeDTO>>> GetAll()
        {
            var recipes = await _context.Recipe
                .Include(r => r.Item)
                .Include(r => r.Ingredient)
                .ToListAsync();

            return Ok(_mapper.Map<List<RecipeDTO>>(recipes));
        }

        // GET: /recipe/{id}
        [HttpGet("{id}")]
        public async Task<ActionResult<RecipeDTO>> GetById(int id)
        {
            var recipe = await _context.Recipe
                .Include(r => r.Item)
                .Include(r => r.Ingredient)
                .FirstOrDefaultAsync(r => r.Id == id);

            if (recipe == null)
                return NotFound();

            return Ok(_mapper.Map<RecipeDTO>(recipe));
        }

        // POST: /recipe
        [HttpPost]
        public async Task<ActionResult<RecipeDTO>> Create([FromBody] RecipeDTO dto)
        {
            // Kiểm tra Item và Ingredient có tồn tại không
            var item = await _context.Item.FindAsync(dto.ItemId);
            if (item == null || item.Deleted)
                return BadRequest("Món ăn không tồn tại");

            var ingredient = await _context.Ingredient.FindAsync(dto.IngredientId);
            if (ingredient == null || ingredient.Deleted)
                return BadRequest("Nguyên liệu không tồn tại");

            // Kiểm tra trùng lặp
            var exists = await _context.Recipe
                .AnyAsync(r => r.ItemId == dto.ItemId && r.IngredientId == dto.IngredientId);
            if (exists)
                return BadRequest("Công thức cho món ăn và nguyên liệu này đã tồn tại");

            var recipe = new Recipe
            {
                ItemId = dto.ItemId,
                IngredientId = dto.IngredientId,
                QuantityNeeded = dto.QuantityNeeded,
                Created = DateTime.Now,
                Updated = DateTime.Now
            };

            _context.Recipe.Add(recipe);
            await _context.SaveChangesAsync();

            return CreatedAtAction(nameof(GetById), new { id = recipe.Id }, _mapper.Map<RecipeDTO>(recipe));
        }

        // PUT: /recipe/{id}
        [HttpPut("{id}")]
        public async Task<IActionResult> Update(int id, [FromBody] RecipeDTO dto)
        {
            if (id != dto.Id)
                return BadRequest("ID không khớp");

            var recipe = await _context.Recipe.FindAsync(id);
            if (recipe == null)
                return NotFound();

            recipe.QuantityNeeded = dto.QuantityNeeded;
            recipe.Updated = DateTime.Now;

            await _context.SaveChangesAsync();
            return NoContent();
        }

        // DELETE: /recipe/{id}
        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(int id)
        {
            var recipe = await _context.Recipe.FindAsync(id);
            if (recipe == null)
                return NotFound();

            _context.Recipe.Remove(recipe);
            await _context.SaveChangesAsync();

            return NoContent();
        }

        // GET: /recipe/by-item/{itemId}
        [HttpGet("by-item/{itemId}")]
        public async Task<ActionResult> GetByItem(int itemId)
        {
            var recipes = await _context.Recipe
                .Include(r => r.Ingredient)
                .Where(r => r.ItemId == itemId)
                .Select(r => new
                {
                    IngredientId = r.IngredientId,
                    IngredientName = r.Ingredient != null ? r.Ingredient.Name : "",
                    QuantityNeeded = r.QuantityNeeded,
                    Unit = r.Ingredient != null ? r.Ingredient.Unit : ""
                })
                .ToListAsync();

            return Ok(recipes);
        }

        // GET: /recipe/by-ingredient/{ingredientId}
        [HttpGet("by-ingredient/{ingredientId}")]
        public async Task<ActionResult> GetByIngredient(int ingredientId)
        {
            var recipes = await _context.Recipe
                .Include(r => r.Item)
                .Where(r => r.IngredientId == ingredientId)
                .Select(r => new
                {
                    ItemId = r.ItemId,
                    ItemName = r.Item != null ? r.Item.Name : "",
                    QuantityNeeded = r.QuantityNeeded
                })
                .ToListAsync();

            return Ok(recipes);
        }
    }
}