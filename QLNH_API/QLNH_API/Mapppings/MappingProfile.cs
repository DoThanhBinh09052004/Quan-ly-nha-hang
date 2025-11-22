using AutoMapper;
using QLNH_API.DTO;
using QLNH_API.Model;

namespace QLNH_API.Mapppings
{
    public class MappingProfile : Profile
    {
        public MappingProfile()
        {
            CreateMap<User, UserSimpleDTO>();

            CreateMap<Restaurant, RestaurantSimpleDTO>();

            CreateMap<Role, RoleSimpleDTO>();


            CreateMap<User, UserDTO>()
            .ForMember(dest => dest.CreatedUser, opt => opt.MapFrom(src => src.CreatedUser))
            .ForMember(dest => dest.UpdatedUser, opt => opt.MapFrom(src => src.UpdatedUser))
            .ForMember(dest => dest.restaurant, opt => opt.MapFrom(src => src.restaurant))
            .ForMember(dest => dest.role, opt => opt.MapFrom(src => src.role));


            CreateMap<Role, RoleDTO>();

            CreateMap<Restaurant, RestaurantDTO>()
            .ForMember(dest => dest.CreatedUser, opt => opt.MapFrom(src => src.CreatedUser))
            .ForMember(dest => dest.UpdatedUser, opt => opt.MapFrom(src => src.UpdatedUser))
            .ForMember(dest => dest.Users, opt => opt.MapFrom(src => src.Users));

            CreateMap<GuestTable, GuestTableDTO>();
            CreateMap<Guest, GuestDTO>();
            CreateMap<Status, StatusDTO>();
            CreateMap<Order, OrderDTO>()
             .ForMember(dest => dest.CreatedUser, opt => opt.MapFrom(src => src.CreatedUser))
            .ForMember(dest => dest.UpdatedUser, opt => opt.MapFrom(src => src.UpdatedUser))
            .ForMember(dest => dest.OrderItems, opt => opt.MapFrom(src => src.OrderItems))
            .ForMember(dest => dest.Status, opt => opt.MapFrom(src => src.Status))
             .ForMember(dest => dest.GuestTable, opt => opt.MapFrom(src => src.GuestTable));

            CreateMap<OrderItem, OrderItemDTO>()
                                .ForMember(dest => dest.Item, opt => opt.MapFrom(src => src.Item));

            CreateMap<Unit, UnitDTO>();
            CreateMap<UnitType, UnitTypeDTO>();
            CreateMap<Category, CategoryDTO>();
            CreateMap<Item, ItemDTO>()
            .ForMember(dest => dest.Unit, opt => opt.MapFrom(src => src.Unit))
            .ForMember(dest => dest.Category, opt => opt.MapFrom(src => src.Category))
            .ForMember(dest => dest.ItemImages, opt => opt.MapFrom(src => src.ItemImages.Where(img => !img.Deleted)));
        }
    }
}
