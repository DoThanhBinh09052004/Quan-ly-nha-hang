using AutoMapper;
using QLNH_API.DTO;
using QLNH_API.DTO.Reservation;
using QLNH_API.Model;
using QLNH_API.Services;

namespace QLNH_API.Mapppings
{
    public class MappingProfile : Profile
    {
        public MappingProfile()
        {
            // =================================================================
            // 1. FUNCTIONAL GROUP: USER & ROLE MANAGEMENT (User, Role)
            // =================================================================
            CreateMap<User, UserSimpleDTO>();
            CreateMap<Role, RoleSimpleDTO>();
            CreateMap<Role, RoleDTO>();

            CreateMap<User, UserDTO>()
                .ForMember(dest => dest.CreatedUser, opt => opt.MapFrom(src => src.CreatedUser))
                .ForMember(dest => dest.UpdatedUser, opt => opt.MapFrom(src => src.UpdatedUser))
                .ForMember(dest => dest.role, opt => opt.MapFrom(src => src.role));

            // =================================================================
            // 2. FUNCTIONAL GROUP: TABLES, ORDERS & KITCHEN (Guest, Table, Order, Kitchen)
            // =================================================================
            CreateMap<Guest, GuestDTO>();
            CreateMap<Status, StatusDTO>();

            CreateMap<Reservation, ReservationDTO>()
                .ForMember(dest => dest.GuestTableName,
                    opt => opt.MapFrom(src => src.GuestTable != null ? src.GuestTable.Name : null))
                .ForMember(dest => dest.ReservationEndTime,
                    opt => opt.MapFrom(src => src.ReservationTime.AddMinutes(src.DurationMinutes)));

            CreateMap<GuestTable, GuestTableDTO>()
                .ForMember(dest => dest.StatusId, opt => opt.MapFrom(src => src.StatusId))
                .ForMember(dest => dest.StatusManuallyOverridden, opt => opt.MapFrom(src => src.StatusManuallyOverridden))
                .ForMember(dest => dest.CurrentOrderTotal, opt => opt.MapFrom(src =>
                    src.Status != null && (src.Status.Code == StatusResolver.TableAvailable || src.Status.Code == StatusResolver.TableOccupied) && src.Orders != null ? src.Orders.Where(o => !o.Deleted && !o.Voided && o.PaidAmount < o.FinalPrice).Sum(o => o.FinalPrice) : 0))
                .ForMember(dest => dest.CurrentGuestName, opt => opt.MapFrom(src =>
                    src.Status != null && (src.Status.Code == StatusResolver.TableAvailable || src.Status.Code == StatusResolver.TableOccupied) && src.Orders != null ? src.Orders.Where(o => !o.Deleted && !o.Voided && o.PaidAmount < o.FinalPrice).Select(o => o.Guest != null ? o.Guest.Name : o.GuestPhone).FirstOrDefault() : null));

            CreateMap<Order, OrderDTO>()
                .ForMember(dest => dest.CreatedUser, opt => opt.MapFrom(src => src.CreatedUser))
                .ForMember(dest => dest.UpdatedUser, opt => opt.MapFrom(src => src.UpdatedUser))
                .ForMember(dest => dest.OrderItems, opt => opt.MapFrom(src => src.OrderItems))
                .ForMember(dest => dest.Status, opt => opt.MapFrom(src => src.Status))
                .ForMember(dest => dest.GuestTable, opt => opt.MapFrom(src => src.GuestTable))
                .ForMember(dest => dest.Guest, opt => opt.MapFrom(src => src.Guest));

            CreateMap<OrderItem, OrderItemDTO>()
                .ForMember(dest => dest.Item, opt => opt.MapFrom(src => src.Item))
                .ForMember(dest => dest.CookingStatusId, opt => opt.MapFrom(src => src.CookingStatusId))
                .ForMember(dest => dest.CookingStatusCode, opt => opt.MapFrom(src => src.CookingStatus != null ? src.CookingStatus.Code : null))
                .ForMember(dest => dest.CookingStatusName, opt => opt.MapFrom(src => src.CookingStatus != null ? src.CookingStatus.Name : null))
                .ForMember(dest => dest.CompletedAt, opt => opt.MapFrom(src => src.CompletedAt))
                .ForMember(dest => dest.KitchenNote, opt => opt.MapFrom(src => src.KitchenNote));

            // Map OrderItem -> OrderItemStatusDTO (for kitchen use)
            CreateMap<OrderItem, OrderItemStatusDTO>()
                .ForMember(dest => dest.Id, opt => opt.MapFrom(src => src.Id))
                .ForMember(dest => dest.Name, opt => opt.MapFrom(src => src.Name))
                .ForMember(dest => dest.Quantity, opt => opt.MapFrom(src => src.Quantity))
                .ForMember(dest => dest.CookingStatusId, opt => opt.MapFrom(src => src.CookingStatusId))
                .ForMember(dest => dest.CompletedAt, opt => opt.MapFrom(src => src.CompletedAt))
                .ForMember(dest => dest.KitchenNote, opt => opt.MapFrom(src => src.KitchenNote))
                .ForMember(dest => dest.OrderId, opt => opt.MapFrom(src => src.OrderId))
                .ForMember(dest => dest.OrderNumber, opt => opt.MapFrom(src => src.Order != null ? src.Order.OrderNumber : null))
                .ForMember(dest => dest.GuestTableId, opt => opt.MapFrom(src => src.Order != null && src.Order.GuestTable != null ? src.Order.GuestTable.Id : (int?)null))
                .ForMember(dest => dest.TableName, opt => opt.MapFrom(src => src.Order != null && src.Order.GuestTable != null ? src.Order.GuestTable.Name : null))
                .ForMember(dest => dest.GuestPhone, opt => opt.MapFrom(src => src.Order != null ? src.Order.GuestPhone : null));


            // =================================================================
            // 3. FUNCTIONAL GROUP: MENU, INVENTORY & PAYMENTS (Item, Category, Ingredient, Payment)
            // =================================================================
            CreateMap<Unit, UnitDTO>();
            CreateMap<UnitType, UnitTypeDTO>();
            CreateMap<Category, CategoryDTO>();
            CreateMap<ExpenseCategory, ExpenseCategoryDTO>();
            CreateMap<Expense, ExpenseDTO>()
                .ForMember(dest => dest.ExpenseCategory, opt => opt.MapFrom(src => src.ExpenseCategory));
            CreateMap<ExpenseRequestDTO, Expense>();
            CreateMap<Ingredient, IngredientDTO>();
            CreateMap<Payment, PaymentDTO>();
            CreateMap<ItemImage, ItemImageDTO>();
            CreateMap<ItemImage, CreateItemImageDTO>().ReverseMap();
            CreateMap<ItemRequestDTO, Item>();

            CreateMap<Item, ItemDTO>()
                .ForMember(dest => dest.Unit, opt => opt.MapFrom(src => src.Unit))
                .ForMember(dest => dest.Category, opt => opt.MapFrom(src => src.Category))
                .ForMember(dest => dest.ItemImages, opt => opt.MapFrom(src => src.ItemImages != null ? src.ItemImages.Where(img => !img.Deleted).ToList() : new List<ItemImage>()));

            CreateMap<Recipe, RecipeDTO>()
                .ForMember(dest => dest.ItemName, opt => opt.MapFrom(src => src.Item != null ? src.Item.Name : null))
                .ForMember(dest => dest.IngredientName, opt => opt.MapFrom(src => src.Ingredient != null ? src.Ingredient.Name : null));


            // =================================================================
            // 4. FUNCTIONAL GROUP: SHIFT MANAGEMENT (Shift, WorkShift)
            // =================================================================
            CreateMap<Shift, ShiftDTO>().ReverseMap();
            CreateMap<ShiftRequestDTO, Shift>();

            CreateMap<WorkShift, WorkShiftDTO>();
            CreateMap<WorkShiftRequestDTO, WorkShift>();
        }
    }
}
