using AutoMapper;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using QLNH_API.Data;
using QLNH_API.DTO;
using QLNH_API.Model;

namespace QLNH_API.Controllers
{
    [ApiController]
    [Route("[controller]")]
    [Authorize(Roles = "Manager")]
    public class ExpenseController : ControllerBase
    {
        private readonly ApplicationDbcontext _context;
        private readonly IMapper _mapper;

        public ExpenseController(ApplicationDbcontext context, IMapper mapper)
        {
            _context = context;
            _mapper = mapper;
        }

        [HttpGet("categories")]
        public async Task<ActionResult<IEnumerable<ExpenseCategoryDTO>>> GetCategories()
        {
            var categories = await _context.ExpenseCategory
                .Where(x => !x.Deleted)
                .OrderBy(x => x.Name)
                .ToListAsync();

            return Ok(_mapper.Map<List<ExpenseCategoryDTO>>(categories));
        }

        [HttpPost("categories")]
        public async Task<ActionResult<ExpenseCategoryDTO>> CreateCategory([FromBody] ExpenseCategoryDTO request)
        {
            if (string.IsNullOrWhiteSpace(request.Name))
            {
                return BadRequest(new { error = "Category name is required." });
            }

            var exists = await _context.ExpenseCategory
                .AnyAsync(x => !x.Deleted && x.Name == request.Name.Trim());
            if (exists)
            {
                return BadRequest(new { error = "Expense category already exists." });
            }

            var category = new ExpenseCategory
            {
                Name = request.Name.Trim(),
                Description = request.Description?.Trim()
            };

            _context.ExpenseCategory.Add(category);
            await _context.SaveChangesAsync();

            return Ok(_mapper.Map<ExpenseCategoryDTO>(category));
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<ExpenseDTO>>> GetExpenses([FromQuery] DateTime? fromDate = null, [FromQuery] DateTime? toDate = null)
        {
            var query = _context.Expense
                .Include(x => x.ExpenseCategory)
                .Where(x => !x.Deleted)
                .AsQueryable();

            if (fromDate.HasValue)
            {
                query = query.Where(x => x.ExpenseDate >= fromDate.Value.Date);
            }

            if (toDate.HasValue)
            {
                var toExclusive = toDate.Value.Date.AddDays(1);
                query = query.Where(x => x.ExpenseDate < toExclusive);
            }

            var expenses = await query
                .OrderByDescending(x => x.ExpenseDate)
                .ThenByDescending(x => x.Id)
                .ToListAsync();

            return Ok(_mapper.Map<List<ExpenseDTO>>(expenses));
        }

        [HttpPost]
        public async Task<ActionResult<ExpenseDTO>> CreateExpense([FromBody] ExpenseRequestDTO request)
        {
            if (string.IsNullOrWhiteSpace(request.Title))
            {
                return BadRequest(new { error = "Title is required." });
            }

            if (request.Amount <= 0)
            {
                return BadRequest(new { error = "Amount must be greater than 0." });
            }

            var category = await _context.ExpenseCategory
                .FirstOrDefaultAsync(x => x.Id == request.ExpenseCategoryId && !x.Deleted);
            if (category == null)
            {
                return BadRequest(new { error = "Expense category not found." });
            }

            var expense = _mapper.Map<Expense>(request);
            expense.Title = request.Title.Trim();
            expense.Note = request.Note?.Trim();

            _context.Expense.Add(expense);
            await _context.SaveChangesAsync();

            await _context.Entry(expense).Reference(x => x.ExpenseCategory).LoadAsync();

            return Ok(_mapper.Map<ExpenseDTO>(expense));
        }

        [HttpPut("{id}")]
        public async Task<ActionResult<ExpenseDTO>> UpdateExpense(int id, [FromBody] ExpenseRequestDTO request)
        {
            var expense = await _context.Expense.FirstOrDefaultAsync(x => x.Id == id && !x.Deleted);
            if (expense == null)
            {
                return NotFound(new { error = "Expense not found." });
            }

            if (string.IsNullOrWhiteSpace(request.Title))
            {
                return BadRequest(new { error = "Title is required." });
            }

            if (request.Amount <= 0)
            {
                return BadRequest(new { error = "Amount must be greater than 0." });
            }

            var category = await _context.ExpenseCategory
                .FirstOrDefaultAsync(x => x.Id == request.ExpenseCategoryId && !x.Deleted);
            if (category == null)
            {
                return BadRequest(new { error = "Expense category not found." });
            }

            expense.Title = request.Title.Trim();
            expense.Note = request.Note?.Trim();
            expense.Amount = request.Amount;
            expense.ExpenseDate = request.ExpenseDate;
            expense.ExpenseCategoryId = request.ExpenseCategoryId;
            expense.Updated = DateTime.Now;

            await _context.SaveChangesAsync();
            await _context.Entry(expense).Reference(x => x.ExpenseCategory).LoadAsync();

            return Ok(_mapper.Map<ExpenseDTO>(expense));
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteExpense(int id)
        {
            var expense = await _context.Expense.FirstOrDefaultAsync(x => x.Id == id && !x.Deleted);
            if (expense == null)
            {
                return NotFound(new { error = "Expense not found." });
            }

            expense.Deleted = true;
            expense.Updated = DateTime.Now;
            await _context.SaveChangesAsync();

            return NoContent();
        }
    }
}
