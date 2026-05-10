using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using QLNH_API.DTO;
using QLNH_API.Services;

namespace QLNH_API.Controllers
{
    [ApiController]
    [Route("[controller]")]
    [Authorize(Roles = "Manager")]
    public class ChatbotController : ControllerBase
    {
        private readonly RevenueService _revenueService;
        private readonly AiClientService _ai;

        public ChatbotController(RevenueService revenueService, AiClientService ai)
        {
            _revenueService = revenueService;
            _ai = ai;

        }

        // POST /chatbot/business
        [HttpPost("business")]
        public async Task<IActionResult> Business([FromBody] BusinessChatRequestDto req, CancellationToken ct)
        {
            if (req == null || string.IsNullOrWhiteSpace(req.Message))
                return BadRequest(new { error = "Message is required." });

            try
            {
                // 1) build snapshot from the same sources as /revenue/*
                var snapshot = new RevenueBusinessSnapshotDto
                {
                    Monthly = await _revenueService.GetRevenueByMonth(),
                    Daily = await _revenueService.GetRevenueByDay(),
                    ByHour = await _revenueService.GetRevenueByHour(req.DaysHour),
                    ByDayOfWeek = await _revenueService.GetRevenueByDayOfWeek(req.DaysDow),
                    BestSellers = await _revenueService.GetBestSellingItems(req.DaysBest, req.TopBest),
                    TableTurnover = await _revenueService.GetTableTurnoverAnalysis(req.DaysTurnover),
                    ByPartySize = await _revenueService.GetRevenueByPartySize(req.DaysParty),
                    Forecast = await _revenueService.GetRevenueForecast(req.DaysForecast),
                    ListOfItem = await _ai.GetItemsForChatbot()
                };

                // 2) send to AI service chatbot
                var aiReq = new AiBusinessChatRequestDto
                {
                    Message = req.Message.Trim(),
                    Snapshot = snapshot
                };

                var aiRes = await _ai.AnalyzeBusinessAsync(aiReq, ct);

                return Ok(aiRes);
            }
            catch (HttpRequestException ex)
            {
                // AI service unavailable
                return StatusCode(502, new { error = "AI service unavailable", detail = ex.Message });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = "Chatbot failed", detail = ex.Message });
            }
        }
    }
}