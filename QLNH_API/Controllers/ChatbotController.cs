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
        private readonly BusinessChatDataService _chatDataService;
        private readonly AiClientService _ai;

        public ChatbotController(BusinessChatDataService chatDataService, AiClientService ai)
        {
            _chatDataService = chatDataService;
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
                var snapshot = await _chatDataService.GetSnapshotAsync(req.Message, req, ct);
                var aiReq = new AiBusinessChatRequestDto
                {
                    Message = req.Message.Trim(),
                    Intent = BusinessChatDataService.DetermineIntent(req.Message),
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
    }
}
