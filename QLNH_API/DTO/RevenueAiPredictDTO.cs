using System.Text.Json.Serialization;

namespace QLNH_API.DTO
{
    public class RevenueAiPredictRequestDto
    {
        public string Date { get; set; } = "";
    }

    public class RevenueAiPredictResponseDto
    {
        [JsonPropertyName("date")]
        public string Date { get; set; } = "";

        [JsonPropertyName("predicted_revenue")]
        public double PredictedRevenue { get; set; }
    }
}
