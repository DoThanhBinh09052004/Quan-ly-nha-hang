using System.Net.Http;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using QLNH_API.DTO;
using QLNH_API.Services;

namespace QLNH_API.Controllers
{
    [ApiController]
    [Route("[controller]")]
    [Authorize(Roles = "Manager")]
    public class RevenueController : ControllerBase
    {
        private readonly RevenueService _service;
        private readonly AiClientService _aiRevenue;

        public RevenueController(RevenueService service, AiClientService aiRevenue)
        {
            _service = service;
            _aiRevenue = aiRevenue;
        }

        [HttpGet("monthly")]
        public async Task<IActionResult> GetRevenueByMonth(
            [FromQuery] DateTime? fromDate = null,
            [FromQuery] DateTime? toDate = null,
            CancellationToken cancellationToken = default)
        {
            var result = await _service.GetRevenueByMonth(fromDate, toDate, cancellationToken);
            return Ok(result);
        }

        [HttpGet("daily")]
        public async Task<IActionResult> GetRevenueByDay(
            [FromQuery] DateTime? fromDate = null,
            [FromQuery] DateTime? toDate = null,
            CancellationToken cancellationToken = default)
        {
            var result = await _service.GetRevenueByDay(fromDate, toDate, cancellationToken);
            return Ok(result);
        }

        [HttpGet("gross-profit-margin")]
        public async Task<IActionResult> GetGrossProfitAndProfitMarginReport(
            [FromQuery] DateTime? fromDate = null,
            [FromQuery] DateTime? toDate = null,
            CancellationToken cancellationToken = default)
        {
            var result = await _service.GetGrossProfitAndProfitMarginReport(fromDate, toDate, cancellationToken);
            return Ok(result);
        }

        [HttpGet("net-profit")]
        public async Task<IActionResult> GetNetProfitReport(
            [FromQuery] DateTime? fromDate = null,
            [FromQuery] DateTime? toDate = null,
            CancellationToken cancellationToken = default)
        {
            var result = await _service.GetNetProfitReport(fromDate, toDate, cancellationToken);
            return Ok(result);
        }

        [HttpGet("by-hour")]
        public async Task<IActionResult> GetRevenueByHour([FromQuery] int days = 30)
        {
            var result = await _service.GetRevenueByHour(days);
            return Ok(result);
        }

        [HttpGet("by-day-of-week")]
        public async Task<IActionResult> GetRevenueByDayOfWeek([FromQuery] int days = 90)
        {
            var result = await _service.GetRevenueByDayOfWeek(days);
            return Ok(result);
        }

        [HttpGet("best-sellers")]
        public async Task<IActionResult> GetBestSellers([FromQuery] int days = 30, [FromQuery] int top = 10, [FromQuery] int? categoryId = null)
        {
            var result = categoryId.HasValue && categoryId.Value > 0
                ? await _service.GetBestSellingItemsByCategory(categoryId.Value, days, top)
                : await _service.GetBestSellingItems(days, top);
            return Ok(result);
        }

        [HttpGet("table-turnover")]
        public async Task<IActionResult> GetTableTurnover([FromQuery] int days = 30)
        {
            var result = await _service.GetTableTurnoverAnalysis(days);
            return Ok(result);
        }

        [HttpGet("by-party-size")]
        public async Task<IActionResult> GetRevenueByPartySize([FromQuery] int days = 90)
        {
            var result = await _service.GetRevenueByPartySize(days);
            return Ok(result);
        }

        [HttpGet("by-category")]
        public async Task<IActionResult> GetRevenueByCategory([FromQuery] int days = 30)
        {
            var result = await _service.GetRevenueByCategory(days);
            return Ok(result);
        }

        [HttpGet("forecast")]
        public async Task<IActionResult> GetRevenueForecast([FromQuery] int days = 7)
        {
            var result = await _service.GetRevenueForecast(days);
            return Ok(result);
        }

        [HttpPost("ai-predict")]
        public async Task<IActionResult> PredictRevenueByAi([FromBody] RevenueAiPredictRequestDto request, CancellationToken cancellationToken)
        {
            if (request == null || string.IsNullOrWhiteSpace(request.Date))
                return BadRequest(new { error = "Date is required (yyyy-MM-dd)." });

            try
            {
                var result = await _aiRevenue.PredictRevenueAsync(request.Date.Trim(), cancellationToken);
                return Ok(new
                {
                    date = result.Date,
                    predictedRevenue = result.PredictedRevenue
                });
            }
            catch (HttpRequestException ex)
            {
                return StatusCode(502, new { error = "AI service unavailable", detail = ex.Message });
            }
            catch (Exception ex)
            {
                return StatusCode(502, new { error = "AI prediction failed", detail = ex.Message });
            }
        }

        [HttpGet("ai-forecast")]
        public async Task<IActionResult> PredictRevenueRangeByAi([FromQuery] int days = 7, CancellationToken cancellationToken = default)
        {
            try
            {
                days = Math.Clamp(days, 1, 31);
                var startDate = DateTime.Today.AddDays(1).ToString("yyyy-MM-dd");
                var result = await _aiRevenue.PredictRevenueRangeAsync(startDate, days, cancellationToken);

                return Ok(result.Select(item => new
                {
                    date = item.Date,
                    predictedRevenue = item.PredictedRevenue
                }));
            }
            catch (HttpRequestException ex)
            {
                return StatusCode(502, new { error = "AI service unavailable", detail = ex.Message });
            }
            catch (Exception ex)
            {
                return StatusCode(502, new { error = "AI prediction failed", detail = ex.Message });
            }
        }
    }
}
