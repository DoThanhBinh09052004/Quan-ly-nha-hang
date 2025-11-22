using Microsoft.AspNetCore.Mvc;
using QLNH_API.Services;

namespace QLNH_API.Controllers
{
    [ApiController]
    [Route("[controller]")]
    public class RevenueController : Controller
    {
        private readonly RevenueService _service;

        public RevenueController(RevenueService service)
        {
            _service = service;
        }

        [HttpGet("monthly")]
        public async Task<IActionResult> GetRevenueByMonth()
        {
            var result = await _service.GetRevenueByMonth();
            return Ok(result);
        }

        [HttpGet("daily")]
        public async Task<IActionResult> GetRevenueByDay()
        {
            var result = await _service.GetRevenueByDay();
            return Ok(result);
        }
    }
}
   

