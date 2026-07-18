namespace QLNH_API.Services
{
    public sealed class ReservationPolicyOptions
    {
        public const string SectionName = "ReservationPolicy";

        public int LockBeforeMinutes { get; set; } = 45;
        public int LateArrivalGraceMinutes { get; set; } = 20;
    }
}
