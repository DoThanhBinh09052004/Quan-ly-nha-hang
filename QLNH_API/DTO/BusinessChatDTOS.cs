using System.Text.Json;

namespace QLNH_API.DTO
{
    public sealed class BusinessChatRequestDto
    {
        public string Message { get; set; } = "";
        public int DaysHour { get; set; } = 30;
        public int DaysDow { get; set; } = 30;
        public int DaysBest { get; set; } = 30;
        public int DaysTurnover { get; set; } = 30;
        public int DaysParty { get; set; } = 30;
        public int DaysForecast { get; set; } = 7;
        public int TopBest { get; set; } = 10;
    }

    // Snapshot gửi sang AI service (để AI service không cần gọi C# revenue endpoints)
    public sealed class RevenueBusinessSnapshotDto
    {
        public List<string> DataScopes { get; set; } = new();
        public DateTime FromDate { get; set; }
        public DateTime ToDate { get; set; }
        public object? Overview { get; set; }
        public object? Monthly { get; set; }
        public object? Daily { get; set; }
        public object? ByHour { get; set; }
        public object? ByDayOfWeek { get; set; }
        public object? BestSellers { get; set; }
        public object? ByCategory { get; set; }
        public object? TableTurnover { get; set; }
        public object? ByPartySize { get; set; }
        public object? Forecast { get; set; }
        public GrossProfitMarginReportDTO? GrossProfitReport { get; set; }
        public NetProfitReportDTO? NetProfitReport { get; set; }
    }

    // Request gửi sang AI service
    public sealed class AiBusinessChatRequestDto
    {
        public string Message { get; set; } = "";
        public string Intent { get; set; } = "";
        public RevenueBusinessSnapshotDto Snapshot { get; set; } = new();
    }

    // JSON structured trả về từ AI service
    public sealed class AiBusinessChatResponseDto
    {
        public string Summary { get; set; } = "";
        public string AnswerText { get; set; } = "";
        public JsonElement Kpis { get; set; } // giữ flexible
        public JsonElement Insights { get; set; } // array
        public JsonElement Actions { get; set; } // array
        public JsonElement Risks { get; set; } // array
        public JsonElement FollowUpQuestions { get; set; } // array
    }
}
