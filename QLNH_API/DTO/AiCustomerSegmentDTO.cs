using System.Text.Json.Serialization;

namespace QLNH_API.DTO
{
    /// <summary>
    /// Snapshot feature data used by the AI service to cluster guests.
    /// No personally identifiable data is included in this contract.
    /// </summary>
    public sealed class AiCustomerSegmentRequestDto
    {
        [JsonPropertyName("target_guest_id")]
        public int TargetGuestId { get; set; }

        [JsonPropertyName("guests")]
        public List<AiCustomerSegmentGuestDto> Guests { get; set; } = new();
    }

    public sealed class AiCustomerSegmentGuestDto
    {
        [JsonPropertyName("guest_id")]
        public int GuestId { get; set; }

        [JsonPropertyName("features")]
        public Dictionary<string, double> Features { get; set; } = new();
    }
}
