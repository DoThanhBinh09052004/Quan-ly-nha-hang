using System.Text.Json.Serialization;

namespace QLNH_API.DTO
{
    public sealed class AiCustomerSegmentRequestDto
    {
        [JsonPropertyName("guest")]
        public AiCustomerSegmentGuestDto Guest { get; set; } = new();

        [JsonPropertyName("features")]
        public Dictionary<string, double> Features { get; set; } = new();
    }

    public sealed class AiCustomerSegmentGuestDto
    {
        [JsonPropertyName("guest_id")]
        public int GuestId { get; set; }

        [JsonPropertyName("points")]
        public int Points { get; set; }

        [JsonPropertyName("created")]
        public DateTime Created { get; set; }
    }

}
