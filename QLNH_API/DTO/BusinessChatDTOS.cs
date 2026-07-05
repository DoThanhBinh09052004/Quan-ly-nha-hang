using System.Text.Json;

namespace QLNH_API.DTO
{
    public sealed class BusinessChatRequestDto
    {
        public string Message { get; set; } = "";
        public string Intent { get; set; } = "";
        public int DaysHour { get; set; } = 30;
        public int DaysDow { get; set; } = 90;
        public int DaysBest { get; set; } = 30;
        public int DaysTurnover { get; set; } = 30;
        public int DaysParty { get; set; } = 90;
        public int DaysForecast { get; set; } = 7;
        public int TopBest { get; set; } = 10;
    }

    // Snapshot gửi sang AI service (để AI service không cần gọi C# revenue endpoints)
    public sealed class RevenueBusinessSnapshotDto
    {
        public object Monthly { get; set; } = new();
        public object Daily { get; set; } = new();
        public object ByHour { get; set; } = new();
        public object ByDayOfWeek { get; set; } = new();
        public object BestSellers { get; set; } = new();
        public object TableTurnover { get; set; } = new();
        public object ByPartySize { get; set; } = new();
        public object Forecast { get; set; } = new();
        public object ListOfItem { get; set; } = new();
        public object GrossProfitReport { get; set; } = new();
        public object RelativePeriods { get; set; } = new();
        public object InterpretationNotes { get; set; } = new();


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
