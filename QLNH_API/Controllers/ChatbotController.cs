using System.Text.RegularExpressions;
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
                    ListOfItem = await _ai.GetItemsForChatbot(),
                    GrossProfitReport = await _revenueService.GetGrossProfitAndProfitMarginReport(),
                    RelativePeriods = await _revenueService.GetRelativeBusinessSituation(),
                    InterpretationNotes = _revenueService.GetChatbotInterpretationNotes()
                };

                var intent = ClassifyIntent(req.Intent, req.Message);

                var aiReq = new AiBusinessChatRequestDto
                {
                    Message = req.Message.Trim(),
                    Intent = intent,
                    Snapshot = snapshot
                };

                var aiRes = await _ai.AnalyzeBusinessAsync(aiReq, ct);

                return Ok(aiRes);
            }
            catch (HttpRequestException ex)
            {
                return StatusCode(502, new { error = "AI service unavailable", detail = ex.Message });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = "Chatbot failed", detail = ex.Message });
            }
        }

        private static string ClassifyIntent(string requestedIntent, string message)
        {
            if (!string.IsNullOrWhiteSpace(requestedIntent))
                return NormalizeIntent(requestedIntent);

            var text = NormalizeText(message);

            var rules = new (string Intent, string[] Keywords)[]
            {
                ("recommendation", new[]
                {
                    "goi y", "gợi ý", "de xuat", "đề xuất", "khuyen nghi", "khuyến nghị",
                    "nen day", "nên đẩy", "nen ban", "nên bán", "combo", "menu",
                    "mon nao", "món nào", "mon nen", "món nên", "upsell", "cross-sell",
                }),
                ("compare", new[]
                {
                    "so sanh", "so với", "so voi", "vs", "giua", "khac nhau",
                    "chenh lech", "compare", "comparison",
                }),
                ("diagnosis", new[]
                {
                    "tai sao", "tại sao", "nguyen nhan", "nguyên nhân", "van de", "vấn đề",
                    "sut giam", "sụt giảm", "giam", "drop", "problem", "why",
                }),
                ("trend", new[]
                {
                    "xu huong", "xu hướng", "tang", "giảm", "giam", "doanh thu",
                    "revenue", "tuan nay", "tuần này", "thang nay", "tháng này",
                    "hom nay", "hôm nay", "peak", "cao diem", "cao điểm",
                }),
                ("summary", new[]
                {
                    "tom tat", "tóm tắt", "tong quan", "tổng quan", "overview",
                    "summary", "nhin chung", "nhìn chung",
                }),
            };

            foreach (var (intent, keywords) in rules)
            {
                if (keywords.Any(keyword => text.Contains(keyword, StringComparison.Ordinal)))
                    return intent;
            }

            return "summary";
        }

        private static string NormalizeIntent(string intent)
        {
            var normalized = NormalizeText(intent);
            return normalized switch
            {
                "recommend" or "recommendation" => "recommendation",
                "compare" or "comparison" => "compare",
                "diagnosis" => "diagnosis",
                "trend" => "trend",
                "summary" => "summary",
                "followup" or "follow-up" => "followup",
                _ => "summary",
            };
        }

        private static string NormalizeText(string value)
        {
            if (string.IsNullOrWhiteSpace(value))
                return string.Empty;

            return Regex.Replace(value.Trim().ToLowerInvariant(), "\\s+", " ");
        }
    }
}
