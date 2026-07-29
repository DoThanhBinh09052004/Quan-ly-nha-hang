using QLNH_API.Model;

namespace QLNH_API.Services
{
    public sealed class OrderPointsException : Exception
    {
        public OrderPointsException(string message) : base(message)
        {
        }
    }

    public sealed class OrderPointsService
    {
        public const int MinimumPoints = 50;
        public const int PointsStep = 50;
        public const decimal PointValue = 500m;
        public const decimal PhoneDiscountRate = 0.03m;

        public void SetUsedPoint(
            Order order,
            Guest? previousGuest,
            Guest? targetGuest,
            int requestedUsedPoint)
        {
            ValidateRequestedPoints(order, targetGuest, requestedUsedPoint);
            AdjustGuestBalance(order.UsedPoint, requestedUsedPoint, previousGuest, targetGuest);

            order.UsedPoint = requestedUsedPoint;
            ApplyPricing(order, targetGuest);
        }

        public void RepriceAfterTotalChange(Order order)
        {
            var guest = order.Guest;
            var maximumUsedPoint = GetMaximumUsedPoint(order.TotalPrice, IsPhoneDiscountEligible(order, guest));
            var adjustedUsedPoint = Math.Min(order.UsedPoint, maximumUsedPoint);

            SetUsedPoint(order, guest, guest, adjustedUsedPoint);
        }

        public void RefundAllUsedPoints(Order order)
        {
            SetUsedPoint(order, order.Guest, order.Guest, 0);
        }

        private static void ValidateRequestedPoints(Order order, Guest? targetGuest, int requestedUsedPoint)
        {
            if (requestedUsedPoint < 0)
            {
                throw new OrderPointsException("Số điểm sử dụng không được âm.");
            }

            if (requestedUsedPoint > 0 &&
                (requestedUsedPoint < MinimumPoints || requestedUsedPoint % PointsStep != 0))
            {
                throw new OrderPointsException(
                    $"Số điểm phải từ {MinimumPoints} điểm và là bội số của {PointsStep}.");
            }

            if (requestedUsedPoint > 0 && targetGuest == null)
            {
                throw new OrderPointsException(
                    "Vui lòng chọn khách hàng hợp lệ để sử dụng điểm.");
            }

            var maximumUsedPoint = GetMaximumUsedPoint(
                order.TotalPrice,
                IsPhoneDiscountEligible(order, targetGuest));

            if (requestedUsedPoint > maximumUsedPoint)
            {
                throw new OrderPointsException(
                    $"Đơn hàng chỉ có thể sử dụng tối đa {maximumUsedPoint} điểm.");
            }
        }

        private static void AdjustGuestBalance(
            int currentUsedPoint,
            int requestedUsedPoint,
            Guest? previousGuest,
            Guest? targetGuest)
        {
            if (previousGuest?.Id == targetGuest?.Id)
            {
                if (targetGuest == null)
                {
                    return;
                }

                var difference = requestedUsedPoint - currentUsedPoint;
                if (difference > 0 && targetGuest.Points < difference)
                {
                    throw new OrderPointsException(
                        $"Khách hàng chỉ còn {targetGuest.Points} điểm khả dụng.");
                }

                targetGuest.Points -= difference;
                targetGuest.Updated = DateTime.Now;
                return;
            }

            if (currentUsedPoint > 0)
            {
                if (previousGuest == null)
                {
                    throw new OrderPointsException(
                        "Không tìm thấy khách hàng đã sử dụng điểm của đơn hàng.");
                }

                previousGuest.Points += currentUsedPoint;
                previousGuest.Updated = DateTime.Now;
            }

            if (requestedUsedPoint > 0)
            {
                if (targetGuest == null || targetGuest.Points < requestedUsedPoint)
                {
                    throw new OrderPointsException(
                        $"Khách hàng chỉ còn {targetGuest?.Points ?? 0} điểm khả dụng.");
                }

                targetGuest.Points -= requestedUsedPoint;
                targetGuest.Updated = DateTime.Now;
            }
        }

        private static void ApplyPricing(Order order, Guest? guest)
        {
            var phoneDiscount = IsPhoneDiscountEligible(order, guest)
                ? order.TotalPrice * PhoneDiscountRate
                : 0m;
            var pointsDiscount = order.UsedPoint * PointValue;

            order.Discount = Math.Min(order.TotalPrice, phoneDiscount + pointsDiscount);
            order.FinalPrice = Math.Max(0, order.TotalPrice - order.Discount);
            order.ChangeAmount = order.PaidAmount - order.FinalPrice;
            order.Updated = DateTime.Now;
        }

        private static int GetMaximumUsedPoint(decimal totalPrice, bool hasPhoneDiscount)
        {
            var phoneDiscount = hasPhoneDiscount ? totalPrice * PhoneDiscountRate : 0m;
            var remainingValue = Math.Max(0, totalPrice - phoneDiscount);
            var pointsByValue = (int)Math.Floor(remainingValue / PointValue);

            return pointsByValue / PointsStep * PointsStep;
        }

        private static bool IsPhoneDiscountEligible(Order order, Guest? guest)
        {
            return guest != null && !string.IsNullOrWhiteSpace(order.GuestPhone);
        }
    }
}
