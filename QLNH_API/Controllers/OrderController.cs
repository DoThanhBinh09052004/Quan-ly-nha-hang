using AutoMapper;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using QLNH_API.Data;
using QLNH_API.DTO;
using QLNH_API.Model;
using QLNH_API.Services;
using System.Data;

namespace QLNH_API.Controllers
{
    [ApiController]
    [Route("[controller]")]
    public class OrderController : ControllerBase
    {
        private readonly ApplicationDbcontext _context;
        private readonly IMapper _mapper;
        private readonly AiClientService _aiService;
        private readonly StatusResolver _statusResolver;
        private readonly ReservationService _reservationService;
        private readonly IngredientInventoryService _ingredientInventoryService;
        private readonly RevenueService _revenueService;
        private readonly OrderPointsService _orderPointsService;

        public OrderController(ApplicationDbcontext context, IMapper mapper, AiClientService aiService, StatusResolver statusResolver, ReservationService reservationService, IngredientInventoryService ingredientInventoryService, RevenueService revenueService, OrderPointsService orderPointsService)
        {
            _context = context;
            _mapper = mapper;
            _aiService = aiService;
            _statusResolver = statusResolver;
            _reservationService = reservationService;
            _ingredientInventoryService = ingredientInventoryService;
            _revenueService = revenueService;
            _orderPointsService = orderPointsService;
        }

        [HttpGet]
        [Authorize(Roles = "Manager, Service Staff")]
        public async Task<ActionResult<OrderListResponseDTO>> GetOrder(
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 10,
            [FromQuery] string? search = null,
            [FromQuery] string? sortField = "created",
            [FromQuery] string? sortOrder = "desc")
        {
            try
            {
                page = Math.Max(page, 1);
                pageSize = Math.Clamp(pageSize, 1, 100);

                var query = _context.Order
                    .AsNoTracking()
                    .Where(o => !o.Deleted)
                    ;

                if (!string.IsNullOrWhiteSpace(search))
                {
                    var keyword = $"%{search.Trim()}%";
                    query = query.Where(o =>
                        EF.Functions.Like(o.OrderNumber, keyword) ||
                        (o.GuestTable != null && EF.Functions.Like(o.GuestTable.Name, keyword)) ||
                        (o.Status != null && EF.Functions.Like(o.Status.Name, keyword)));
                }

                var totalRecords = await query.CountAsync();

                var todayRevenue = await _revenueService.GetTodayRevenue();

                var descending = string.Equals(sortOrder, "desc", StringComparison.OrdinalIgnoreCase) || sortOrder == "-1";
                query = (sortField ?? "").ToLowerInvariant() switch
                {
                    "ordernumber" => descending ? query.OrderByDescending(o => o.OrderNumber) : query.OrderBy(o => o.OrderNumber),
                    "totalprice" => descending ? query.OrderByDescending(o => o.TotalPrice) : query.OrderBy(o => o.TotalPrice),
                    "finalprice" => descending ? query.OrderByDescending(o => o.FinalPrice) : query.OrderBy(o => o.FinalPrice),
                    "paidamount" => descending ? query.OrderByDescending(o => o.PaidAmount) : query.OrderBy(o => o.PaidAmount),
                    "changeamount" => descending ? query.OrderByDescending(o => o.ChangeAmount) : query.OrderBy(o => o.ChangeAmount),
                    "guesttable.name" => descending ? query.OrderByDescending(o => o.GuestTable != null ? o.GuestTable.Name : "") : query.OrderBy(o => o.GuestTable != null ? o.GuestTable.Name : ""),
                    "status.name" => descending ? query.OrderByDescending(o => o.Status != null ? o.Status.Name : "") : query.OrderBy(o => o.Status != null ? o.Status.Name : ""),
                    "updated" => descending ? query.OrderByDescending(o => o.Updated) : query.OrderBy(o => o.Updated),
                    _ => descending ? query.OrderByDescending(o => o.Created) : query.OrderBy(o => o.Created),
                };

                var items = await query
                    .Skip((page - 1) * pageSize)
                    .Take(pageSize)
                    .Select(o => new OrderListItemDTO
                    {
                        Id = o.Id,
                        OrderNumber = o.OrderNumber,
                        Created = o.Created,
                        Updated = o.Updated,
                        TotalPrice = o.TotalPrice,
                        Discount = o.Discount,
                        UsedPoint = o.UsedPoint,
                        FinalPrice = o.FinalPrice,
                        PaidAmount = o.PaidAmount,
                        ChangeAmount = o.ChangeAmount,
                        GuestPhone = o.GuestPhone,
                        GuestTableId = o.GuestTableId,
                        ReservationId = o.ReservationId,
                        GuestTable = o.GuestTable == null ? null : new SimpleLookupDTO
                        {
                            Id = o.GuestTable.Id,
                            Name = o.GuestTable.Name
                        },
                        Status = o.Status == null ? null : new SimpleLookupDTO
                        {
                            Id = o.Status.Id,
                            Name = o.Status.Name
                        }
                    })
                    .ToListAsync();

                return Ok(new OrderListResponseDTO
                {
                    Items = items,
                    TotalRecords = totalRecords,
                    TodayRevenue = todayRevenue
                });
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error getting orders: {ex}");
                return Problem(
                    title: "Internal server error",
                    detail: "Failed to get orders.",
                    statusCode: 500);
            }
        }

        [HttpGet("{id}")]
        [Authorize(Roles = "Manager, Service Staff")]
        public async Task<ActionResult<OrderDTO>> GetOrderById(int id)
        {
            try
            {
                var order = await _context.Order
                    .Include(o => o.OrderItems)
                        .ThenInclude(oi => oi.Item)
                    .Include(o => o.CreatedUser)
                    .Include(o => o.UpdatedUser)
                    .Include(o => o.GuestTable)
                    .Include(o => o.Reservation)
                    .Include(o => o.Guest)
                    .Include(o => o.Status)
                    .FirstOrDefaultAsync(o => o.Id == id && !o.Deleted);

                if (order == null)
                {
                    return NotFound($"Order with ID {id} not found.");
                }

                var orderDTO = _mapper.Map<OrderDTO>(order);
                return Ok(orderDTO);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error getting order: {ex}");
                return Problem(
                    title: "Internal server error",
                    detail: "Failed to get the order.",
                    statusCode: 500);
            }
        }

        [HttpPost]
        [Authorize(Roles = "Manager,Service Staff")]
        public async Task<ActionResult<OrderDTO>> CreateOrder([FromBody] CreateOrderRequest request)
        {
            await using var transaction = await _context.Database.BeginTransactionAsync(IsolationLevel.Serializable);
            try
            {
                if (request.OrderItems == null || request.OrderItems.Count == 0 ||
                    request.OrderItems.Any(item => item.Quantity <= 0 || !item.ItemId.HasValue))
                {
                    return BadRequest(new { message = "Đơn hàng phải có ít nhất một món hợp lệ" });
                }

                GuestTable? table = null;
                Reservation? reservation = null;
                if (request.GuestTableId.HasValue)
                {
                    table = await _reservationService.LockTableAsync(request.GuestTableId.Value);
                    reservation = await _reservationService.EnsureTableCanAcceptOrderAsync(
                        table, request.ReservationId);
                }

                var pendingItemStatusId = await _statusResolver.GetIdAsync(StatusResolver.OrderItemPending);
                var occupiedTableStatusId = await _statusResolver.GetIdAsync(StatusResolver.TableOccupied);
                var unpaidOrderStatusId = await _statusResolver.GetIdAsync(StatusResolver.OrderUnpaid);

                var order = new Order
                {
                    OrderNumber = string.IsNullOrWhiteSpace(request.OrderNumber) ? GenerateOrderNumber() : request.OrderNumber,
                    Description = request.Description,
                    TotalPrice = request.TotalPrice,
                    PaidAmount = request.PaidAmount,
                    ChangeAmount = request.ChangeAmount,
                    GuestPhone = request.GuestPhone,
                    GuestId = request.GuestId,
                    GuestTableId = request.GuestTableId,
                    ReservationId = request.ReservationId,
                    Discount = 0,
                    UsedPoint = 0,
                    FinalPrice = 0,
                    OrderItems = request.OrderItems?.Select(item => new OrderItem
                    {
                        Name = item.Name,
                        Description = item.Description,
                        Quantity = item.Quantity,
                        SalePrice = item.SalePrice,
                        ItemId = item.ItemId,
                        CookingStatusId = pendingItemStatusId,
                        KitchenNote = item.KitchenNote
                    }).ToList()
                };

                if (reservation != null)
                {
                    order.GuestId ??= reservation.GuestId;
                    order.GuestPhone = string.IsNullOrWhiteSpace(order.GuestPhone)
                        ? reservation.Phone
                        : order.GuestPhone;
                }

                // Xác định khách hàng để áp dụng giảm 3% và điểm.
                Guest? loyaltyGuest = null;
                if (!string.IsNullOrEmpty(order.GuestPhone))
                {
                    loyaltyGuest = await _context.Guest
                        .FirstOrDefaultAsync(g => g.Phone == order.GuestPhone && !g.Deleted);
                }
                else if (order.GuestId.HasValue)
                {
                    loyaltyGuest = await _context.Guest
                        .FirstOrDefaultAsync(g => g.Id == order.GuestId && !g.Deleted);
                }

                if (loyaltyGuest != null)
                {
                    order.GuestId = loyaltyGuest.Id;
                }

                _orderPointsService.SetUsedPoint(
                    order,
                    previousGuest: null,
                    targetGuest: loyaltyGuest,
                    requestedUsedPoint: request.PointsToUse);

                order.ActualCost = 0;
                order.ActualProfit = order.FinalPrice;

                // 3. Xử lý order items
                if (order.OrderItems != null)
                {
                    foreach (var item in order.OrderItems)
                    {
                        item.Order = order;
                        item.Created = DateTime.Now;
                        item.Updated = DateTime.Now;
                        item.Deleted = false;
                        item.Voided = false;
                        item.CookingStatusId ??= pendingItemStatusId;
                    }
                }

                // 4. Cập nhật trạng thái bàn (nếu có chọn bàn)
                if (table != null)
                {
                    table.StatusId = occupiedTableStatusId;
                    table.StatusManuallyOverridden = false;
                    table.Updated = DateTime.Now;
                }
                order.CheckInTime = DateTime.Now;
                if (reservation != null)
                {
                    _reservationService.MarkArrived(reservation);
                }

                // 5. Tạo số đơn hàng
                order.OrderNumber = GenerateOrderNumber();
                order.Created = DateTime.Now;
                order.Updated = DateTime.Now;
                order.StatusId = unpaidOrderStatusId;

                // 6. Tính tiền thừa nếu có paidAmount
                order.ChangeAmount = order.PaidAmount - order.FinalPrice;

                _context.Order.Add(order);
                await _context.SaveChangesAsync();

                if (order.OrderItems != null && order.OrderItems.Count > 0)
                {
                    await _ingredientInventoryService.ReserveAsync(order.OrderItems
                        .Where(item => !item.Deleted && !item.Voided)
                        .Select(item => new OrderItemReservation(item, item.Quantity))
                        .ToList());
                    await _context.SaveChangesAsync();
                }

                if (order.GuestTableId.HasValue)
                {
                    await _reservationService.RefreshTableStatusAsync(order.GuestTableId.Value);
                }

                try
                {
                    await ApplyOrderActualProfitAsync(order);
                    await _context.SaveChangesAsync();
                }
                catch (Exception profitEx)
                {
                    Console.WriteLine($"Failed to calculate order profit after create for OrderId {order.Id}: {profitEx}");
                }

                // 7. Thanh toán tự động nếu đã nhập paidAmount đủ
                if (order.PaidAmount >= order.FinalPrice)
                {
                    order.CheckOutTime = DateTime.Now;
                    await PayOrderInternal(order);
                }

                await transaction.CommitAsync();

                var orderDTO = _mapper.Map<OrderDTO>(order);
                return Ok(orderDTO);
            }
            catch (IngredientInventoryException ex)
            {
                return BadRequest(new IngredientInventoryErrorDTO
                {
                    Message = ex.Message,
                    Shortages = ex.Shortages
                });
            }
            catch (OrderPointsException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (TableAvailabilityException ex)
            {
                return Conflict(new
                {
                    code = ex.Code,
                    message = ex.Message,
                    reservationTime = ex.ReservationTime
                });
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error creating order: {ex}");
                return Problem(
                    title: "Internal server error",
                    detail: $"Failed to create the order. {ex.Message}",
                    statusCode: 500);
            }
        }

        [HttpDelete("{id}")]
        [Authorize(Roles = "Manager")]
        public async Task<IActionResult> Delete(int id)
        {
            await using var transaction = await _context.Database.BeginTransactionAsync(IsolationLevel.Serializable);
            try
            {
                var order = await _context.Order
                    .Include(o => o.OrderItems)
                    .Include(o => o.Guest)
                    .FirstOrDefaultAsync(o => o.Id == id && !o.Deleted);
                if (order == null)
                {
                    return NotFound();
                }

                var guestTableId = order.GuestTableId;

                _orderPointsService.RefundAllUsedPoints(order);

                // Soft delete
                order.Deleted = true;
                order.Updated = DateTime.Now;

                // Soft delete order items
                var orderItems = await _context.OrderItem
                    .Where(oi => oi.OrderId == id)
                    .ToListAsync();

                foreach (var item in orderItems)
                {
                    if (!item.Deleted && !item.Voided)
                    {
                        await _ingredientInventoryService.ReleaseForDeletionAsync(item);
                    }
                    item.Deleted = true;
                    item.Updated = DateTime.Now;
                }

                if (order.ReservationId.HasValue)
                {
                    await _reservationService.MarkCancelledAfterOrderDeletionAsync(order.ReservationId.Value);
                }

                await _context.SaveChangesAsync();
                if (guestTableId.HasValue)
                {
                    await _reservationService.RefreshTableStatusAsync(guestTableId.Value);
                }
                await transaction.CommitAsync();
                return NoContent();
            }
            catch (Exception ex)
            {
                return StatusCode(500, "Đã xảy ra lỗi khi xóa Đơn hàng");
            }
        }

        [HttpPut("{id}")]
        [Authorize(Roles = "Manager, Service Staff")]
        public async Task<IActionResult> Update(int id, [FromBody] UpdateOrderRequest request)
        {
            await using var transaction = await _context.Database.BeginTransactionAsync(IsolationLevel.Serializable);
            try
            {
                var existingOrder = await _context.Order
                    .Include(o => o.GuestTable)
                    .Include(o => o.OrderItems)
                    .Include(o => o.Guest)
                    .Include(o => o.Reservation)
                    .FirstOrDefaultAsync(o => o.Id == id);

                if (existingOrder == null)
                    return NotFound("Order không tồn tại");

                var previousGuestTableId = existingOrder.GuestTableId;
                var pendingItemStatusId = await _statusResolver.GetIdAsync(StatusResolver.OrderItemPending);

                if (request.GuestTableId != previousGuestTableId)
                {
                    if (request.GuestTableId.HasValue)
                    {
                        var targetTable = await _reservationService.LockTableAsync(request.GuestTableId.Value);
                        await _reservationService.EnsureTableCanAcceptOrderAsync(
                            targetTable, null, existingOrder.Id);
                        targetTable.StatusManuallyOverridden = false;

                        if (existingOrder.Reservation != null)
                        {
                            await _reservationService.TransferReservationAsync(
                                existingOrder.Reservation, targetTable.Id);
                        }
                    }
                }

                var paidAmount = request.PaidAmount;
                var guestPhone = string.IsNullOrWhiteSpace(request.GuestPhone) ? null : request.GuestPhone.Trim();
                var previousGuest = existingOrder.Guest;
                Guest? targetGuest = null;

                if (!string.IsNullOrEmpty(guestPhone))
                {
                    targetGuest = await _context.Guest
                        .FirstOrDefaultAsync(g => g.Phone == guestPhone && !g.Deleted);
                }
                else if (request.GuestId.HasValue)
                {
                    targetGuest = await _context.Guest
                        .FirstOrDefaultAsync(g => g.Id == request.GuestId.Value && !g.Deleted);
                }

                existingOrder.OrderNumber = string.IsNullOrWhiteSpace(request.OrderNumber)
                    ? existingOrder.OrderNumber
                    : request.OrderNumber.Trim();
                existingOrder.PaidAmount = paidAmount;
                existingOrder.Description = request.Description;
                existingOrder.GuestTableId = request.GuestTableId;
                existingOrder.GuestPhone = guestPhone;
                existingOrder.Updated = DateTime.Now;

                if (request.OrderItems != null)
                {
                    await SynchronizeOrderItemsAsync(existingOrder, request.OrderItems, pendingItemStatusId);
                    existingOrder.TotalPrice = request.OrderItems.Sum(
                        item => (decimal)item.SalePrice * item.Quantity);
                }
                else
                {
                    existingOrder.TotalPrice = request.TotalPrice;
                }

                _orderPointsService.SetUsedPoint(
                    existingOrder,
                    previousGuest,
                    targetGuest,
                    request.UsedPoint ?? existingOrder.UsedPoint);

                existingOrder.Guest = targetGuest;
                existingOrder.GuestId = targetGuest?.Id;

                Console.WriteLine($"[Order Update] Updating OrderId={id}, TotalPrice={existingOrder.TotalPrice}, Discount={existingOrder.Discount}, FinalPrice={existingOrder.FinalPrice}, PaidAmount={existingOrder.PaidAmount}, ChangeAmount={existingOrder.ChangeAmount}, GuestTableId={existingOrder.GuestTableId}, GuestId={existingOrder.GuestId}, GuestPhone={existingOrder.GuestPhone}");

                await _context.SaveChangesAsync();

                if (previousGuestTableId.HasValue)
                {
                    await _reservationService.RefreshTableStatusAsync(previousGuestTableId.Value);
                }
                if (existingOrder.GuestTableId.HasValue && existingOrder.GuestTableId != previousGuestTableId)
                {
                    await _reservationService.RefreshTableStatusAsync(existingOrder.GuestTableId.Value);
                }

                try
                {
                    Console.WriteLine($"[Order Update] Recalculating actual profit for OrderId={existingOrder.Id} with {existingOrder.OrderItems?.Count ?? 0} order items.");
                    await ApplyOrderActualProfitAsync(existingOrder);
                    await _context.SaveChangesAsync();
                    Console.WriteLine($"[Order Update] Recalculated profit for OrderId={existingOrder.Id}, ActualCost={existingOrder.ActualCost}, ActualProfit={existingOrder.ActualProfit}");
                }
                catch (Exception profitEx)
                {
                    Console.WriteLine($"Failed to calculate order profit after update for OrderId {existingOrder.Id}: {profitEx}");
                }

                // Thanh toán nếu đủ tiền
                if (paidAmount >= existingOrder.FinalPrice)
                {
                    existingOrder.CheckOutTime = DateTime.Now;
                    await PayOrderInternal(existingOrder);
                }

                await transaction.CommitAsync();

                var orderDTO = _mapper.Map<OrderDTO>(existingOrder);
                return Ok(orderDTO);
            }
            catch (IngredientInventoryException ex)
            {
                return BadRequest(new IngredientInventoryErrorDTO
                {
                    Message = ex.Message,
                    Shortages = ex.Shortages
                });
            }
            catch (OrderPointsException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (TableAvailabilityException ex)
            {
                return Conflict(new
                {
                    code = ex.Code,
                    message = ex.Message,
                    reservationTime = ex.ReservationTime
                });
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error updating order: {ex}");
                return Problem(
                    title: "Internal server error",
                    detail: $"Failed to update the order. {ex.Message}",
                    statusCode: 500);
            }
        }

        private async Task SynchronizeOrderItemsAsync(
            Order order,
            IReadOnlyCollection<CreateOrderItemRequest> requestedItems,
            int pendingStatusId)
        {
            if (requestedItems.Count == 0 ||
                requestedItems.Any(item => item.Quantity <= 0 || !item.ItemId.HasValue))
            {
                throw new IngredientInventoryException("Đơn hàng phải có ít nhất một món hợp lệ");
            }

            var duplicateIds = requestedItems
                .Where(item => item.Id > 0)
                .GroupBy(item => item.Id)
                .Where(group => group.Count() > 1)
                .Select(group => group.Key)
                .ToList();

            if (duplicateIds.Count > 0)
            {
                throw new IngredientInventoryException("Danh sách món có chi tiết bị trùng lặp");
            }

            var existingItems = order.OrderItems?
                .Where(item => !item.Deleted && !item.Voided)
                .ToDictionary(item => item.Id) ?? new Dictionary<int, OrderItem>();
            var requestedById = requestedItems
                .Where(item => item.Id > 0)
                .ToDictionary(item => item.Id);
            var reservations = new List<OrderItemReservation>();

            foreach (var existingItem in existingItems.Values)
            {
                if (!requestedById.TryGetValue(existingItem.Id, out var requestedItem))
                {
                    var canBeDeleted = !existingItem.CookingStatusId.HasValue ||
                        existingItem.CookingStatusId == pendingStatusId;
                    if (!canBeDeleted)
                    {
                        throw new IngredientInventoryException(
                            $"Món '{existingItem.Name}' đã bắt đầu chế biến nên không thể xóa khỏi đơn.");
                    }

                    await _ingredientInventoryService.ReleaseForDeletionAsync(existingItem);
                    existingItem.Deleted = true;
                    existingItem.Updated = DateTime.Now;
                    continue;
                }

                var isPending = !existingItem.CookingStatusId.HasValue ||
                    existingItem.CookingStatusId == pendingStatusId;

                if (!isPending &&
                    (requestedItem.Quantity != existingItem.Quantity || requestedItem.ItemId != existingItem.ItemId))
                {
                    throw new IngredientInventoryException(
                        $"Món '{existingItem.Name}' đã bắt đầu chế biến nên không thể thay đổi số lượng");
                }

                if (requestedItem.ItemId != existingItem.ItemId)
                {
                    throw new IngredientInventoryException("Không thể thay đổi món ăn của một chi tiết đơn hàng đã tồn tại");
                }

                if (isPending && requestedItem.Quantity > existingItem.Quantity)
                {
                    reservations.Add(new OrderItemReservation(
                        existingItem,
                        requestedItem.Quantity - existingItem.Quantity));
                }
                else if (isPending && requestedItem.Quantity < existingItem.Quantity)
                {
                    await _ingredientInventoryService.ReleasePendingReductionAsync(existingItem, requestedItem.Quantity);
                }

                existingItem.Name = requestedItem.Name;
                existingItem.Description = requestedItem.Description;
                existingItem.SalePrice = requestedItem.SalePrice;
                existingItem.Quantity = requestedItem.Quantity;
                if (isPending)
                {
                    existingItem.KitchenNote = requestedItem.KitchenNote;
                }
                existingItem.Updated = DateTime.Now;
            }

            foreach (var requestedItem in requestedItems.Where(item => item.Id <= 0))
            {
                var newOrderItem = new OrderItem
                {
                    Name = requestedItem.Name,
                    Description = requestedItem.Description,
                    Quantity = requestedItem.Quantity,
                    SalePrice = requestedItem.SalePrice,
                    ItemId = requestedItem.ItemId,
                    CookingStatusId = pendingStatusId,
                    KitchenNote = requestedItem.KitchenNote,
                    OrderId = order.Id,
                    Order = order,
                    Created = DateTime.Now,
                    Updated = DateTime.Now,
                    Deleted = false,
                    Voided = false
                };

                _context.OrderItem.Add(newOrderItem);
                reservations.Add(new OrderItemReservation(newOrderItem, newOrderItem.Quantity));
            }

            var unknownIds = requestedById.Keys.Where(id => !existingItems.ContainsKey(id)).ToList();
            if (unknownIds.Count > 0)
            {
                throw new IngredientInventoryException("Có chi tiết món không thuộc đơn hàng đang chỉnh sửa");
            }

            await _context.SaveChangesAsync();

            if (reservations.Count > 0)
            {
                await _ingredientInventoryService.ReserveAsync(reservations);
                await _context.SaveChangesAsync();
            }
        }

        private async Task PayOrderInternal(Order order)
        {
            try
            {
                // Nếu đã thanh toán rồi thì không xử lý lại
                var paidOrderStatusId = await _statusResolver.GetIdAsync(StatusResolver.OrderPaid);
                if (order.StatusId == paidOrderStatusId) return;

                // Đổi trạng thái Order
                order.StatusId = paidOrderStatusId;
                order.Updated = DateTime.Now;

                // Cập nhật số lượng item trong kho
                if (order.OrderItems != null && order.OrderItems.Any())
                {
                    foreach (var orderItem in order.OrderItems)
                    {
                        if (orderItem.ItemId.HasValue && !orderItem.Voided && !orderItem.Deleted)
                        {
                            var item = await _context.Item.FindAsync(orderItem.ItemId.Value);
                            if (item != null)
                            {
                                item.Quantity -= orderItem.Quantity;
                                item.Updated = DateTime.Now;
                                Console.WriteLine($"Cập nhật tồn kho món {item.Name}: {item.Quantity + orderItem.Quantity} -> {item.Quantity}");
                            }
                        }
                    }
                }

                // Tích điểm khi thanh toán (chỉ tích khi thanh toán thành công)
                // Đơn đã đổi điểm không được tích thêm điểm khi thanh toán.
                if (order.GuestId.HasValue && order.UsedPoint == 0)
                {
                    var guest = await _context.Guest.FindAsync(order.GuestId.Value);
                    if (guest != null)
                    {
                        // Quy tắc tích điểm: 1 điểm cho mỗi 10,000 VND (sau khi giảm giá)
                        int pointsEarned = (int)(order.FinalPrice / 10000);

                        // Tối thiểu 1 điểm cho đơn hàng > 0
                        if (pointsEarned < 1 && order.FinalPrice > 0)
                        {
                            pointsEarned = 1;
                        }

                        // Cộng điểm cho khách hàng
                        guest.Points += pointsEarned;
                        guest.Updated = DateTime.Now;

                        Console.WriteLine($"Tích {pointsEarned} điểm cho khách hàng {guest.Name} (ID: {guest.Id}). Tổng điểm hiện tại: {guest.Points}");
                    }
                }

                // Tính tiền thừa
                if (order.PaidAmount > order.FinalPrice)
                {
                    order.ChangeAmount = order.PaidAmount - order.FinalPrice;
                }

                await ApplyOrderActualProfitAsync(order);

                if (order.ReservationId.HasValue)
                {
                    await _reservationService.MarkCompletedAsync(order.ReservationId.Value);
                }

                await _context.SaveChangesAsync();

                if (order.GuestTableId.HasValue)
                {
                    await _reservationService.RefreshTableStatusAsync(order.GuestTableId.Value);
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error in PayOrderInternal: {ex}");
                throw; // Re-throw để controller có thể xử lý
            }
        }

        private string GenerateOrderNumber()
        {
            return "ORD-" + DateTime.Now.ToString("yyyyMMdd-HHmmss");
        }

        private async Task ApplyOrderActualProfitAsync(Order order)
        {
            var calculatedCost = await _ingredientInventoryService.CalculateOrderIngredientCostAsync(order.Id);
            var hasActiveItems = order.OrderItems?.Any(oi => !oi.Deleted && !oi.Voided) == true;
            var actualCost = calculatedCost ?? (hasActiveItems ? order.ActualCost : 0m);

            order.ActualCost = actualCost;
            order.ActualProfit = order.FinalPrice - actualCost;
        }

        [HttpPost("ai-recommendations")]
        [Authorize(Roles = "Manager, Service Staff")]
        public async Task<IActionResult> GetAiRecommendations([FromBody] AiRecommendationsRequest request, CancellationToken cancellationToken)
        {
            var items = request?.CurrentItems ?? new List<string>();
            var topN = request?.TopN ?? 5;

            if (items.Count == 0)
                return Ok(new List<AiRecommendationItemDto>());

            try
            {
                var result = await _aiService.RecommendForTableAsync(items, topN, cancellationToken);
                return Ok(result);
            }
            catch (HttpRequestException)
            {
                var fallback = await GetFallbackTopSellingAsync(topN, cancellationToken);
                return Ok(fallback);
            }
            catch
            {
                var fallback = await GetFallbackTopSellingAsync(topN, cancellationToken);
                return Ok(fallback);
            }
        }

        [HttpPost("ai-market-basket")]
        [Authorize(Roles = "Manager, Service Staff")]
        public async Task<IActionResult> AnalyzeMarketBasket([FromBody] AiMarketBasketRequest request, CancellationToken cancellationToken)
        {
            var items = request?.Items ?? new List<string>();
            var topN = request?.TopN ?? 5;

            if (items.Count == 0)
                return Ok(new List<AiRecommendationItemDto>());

            try
            {
                var result = await _aiService.AnalyzeMarketBasketAsync(items, topN, cancellationToken);
                return Ok(result);
            }
            catch (HttpRequestException)
            {
                var fallback = await GetFallbackTopSellingAsync(topN, cancellationToken);
                return Ok(fallback);
            }
            catch
            {
                var fallback = await GetFallbackTopSellingAsync(topN, cancellationToken);
                return Ok(fallback);
            }
        }

        private async Task<List<AiRecommendationItemDto>> GetFallbackTopSellingAsync(int topN, CancellationToken cancellationToken)
        {
            var rows = await _context.OrderItem
                .Where(oi => !oi.Deleted && !oi.Voided)
                .GroupBy(oi => oi.Name)
                .Select(g => new { Name = g.Key, TotalQuantity = g.Sum(x => x.Quantity) })
                .OrderByDescending(x => x.TotalQuantity)
                .Take(topN)
                .ToListAsync(cancellationToken);

            return rows
                .Where(x => !string.IsNullOrWhiteSpace(x.Name))
                .Select(x => new AiRecommendationItemDto
                {
                    Item = x.Name ?? "",
                    Confidence = 0.5,
                    Lift = 1.0
                })
                .ToList();
        }

        public sealed class AiRecommendationsRequest
        {
            public List<string> CurrentItems { get; set; } = new();
            public int TopN { get; set; } = 5;
        }

        public sealed class AiMarketBasketRequest
        {
            public List<string> Items { get; set; } = new();
            public int TopN { get; set; } = 5;
        }


        [HttpPost("{id}/use-points")]
        [Authorize(Roles = "Manager, Service Staff")]
        public async Task<ActionResult<OrderDTO>> UsePoints(int id, [FromBody] UsePointsRequest request)
        {
            await using var transaction = await _context.Database.BeginTransactionAsync(IsolationLevel.Serializable);
            try
            {
                var order = await _context.Order
                    .Include(o => o.Guest)
                    .Include(o => o.OrderItems)
                    .FirstOrDefaultAsync(o => o.Id == id && !o.Deleted);

                if (order == null)
                    return NotFound("Order không tồn tại");

                if (order.GuestId == null || order.Guest == null)
                    return BadRequest("Order không có khách hàng");

                _orderPointsService.SetUsedPoint(
                    order,
                    order.Guest,
                    order.Guest,
                    request.PointsToUse);

                await ApplyOrderActualProfitAsync(order);

                await _context.SaveChangesAsync();
                await transaction.CommitAsync();

                var orderDTO = _mapper.Map<OrderDTO>(order);
                return Ok(new
                {
                    Message = $"Đơn hàng đang sử dụng {order.UsedPoint} điểm",
                    Order = orderDTO,
                    RemainingPoints = order.Guest.Points,
                    NewFinalPrice = order.FinalPrice
                });
            }
            catch (OrderPointsException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error using points: {ex}");
                return Problem(
                    title: "Internal server error",
                    detail: "Failed to use points for the order.",
                    statusCode: 500);
            }
        }

        public class UsePointsRequest
        {
            public int PointsToUse { get; set; }
        }

        public class CreateOrderRequest
        {
            public string? OrderNumber { get; set; }
            public string? Description { get; set; }
            public decimal TotalPrice { get; set; }
            public decimal PaidAmount { get; set; } = 0;
            public decimal ChangeAmount { get; set; } = 0;
            public string? GuestPhone { get; set; }
            public int? GuestId { get; set; }
            public int? GuestTableId { get; set; }
            public int? ReservationId { get; set; }
            public decimal Discount { get; set; } = 0;
            public decimal FinalPrice { get; set; } = 0;
            public int PointsToUse { get; set; } = 0;
            public List<CreateOrderItemRequest>? OrderItems { get; set; }
        }

        public class CreateOrderItemRequest
        {
            public int Id { get; set; }
            public string Name { get; set; } = "";
            public string? Description { get; set; }
            public int Quantity { get; set; } = 1;
            public double SalePrice { get; set; }
            public int? ItemId { get; set; }
            public int? CookingStatusId { get; set; }
            public string? KitchenNote { get; set; }
        }

        public class UpdateOrderRequest
        {
            public string? OrderNumber { get; set; }
            public string? Description { get; set; }
            public decimal TotalPrice { get; set; }
            public decimal PaidAmount { get; set; } = 0;
            public string? GuestPhone { get; set; }
            public int? GuestId { get; set; }
            public int? GuestTableId { get; set; }
            public decimal Discount { get; set; } = 0;
            public decimal FinalPrice { get; set; } = 0;
            public int? UsedPoint { get; set; }
            public List<CreateOrderItemRequest>? OrderItems { get; set; }
        }
    }
}
