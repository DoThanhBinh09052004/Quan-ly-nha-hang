using Microsoft.EntityFrameworkCore;
using QLNH_API.Model;

namespace QLNH_API.Data
{
    public class ApplicationDbcontext : DbContext
    {
        public ApplicationDbcontext(DbContextOptions<ApplicationDbcontext> options)
            : base(options)
        {
        }

        public DbSet<User> User { get; set; }
        public DbSet<Item> Item { get; set; }
        public DbSet<Category> Category { get; set; }
        public DbSet<Guest> Guest { get; set; }
        public DbSet<GuestTable> GuestTable { get; set; }
        public DbSet<ItemImage> ItemImage { get; set; }
        public DbSet<Order> Order { get; set; }
        public DbSet<OrderItem> OrderItem { get; set; }

        public DbSet<Role> Role { get; set; }
        public DbSet<Status> Status { get; set; }
        public DbSet<Unit> Unit { get; set; }

          public DbSet<Ingredient> Ingredient { get; set; }
        public DbSet<Recipe> Recipe { get; set; }

        public DbSet<Restaurant> Restaurant { get; set; }
        public DbSet<Payment> Payment { get; set; }
        public DbSet<Shift> Shift { get; set; }
        public DbSet<WorkShift> WorkShift { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            // ================== User - Role ==================
            modelBuilder.Entity<User>()
                .HasOne(u => u.role)
                .WithMany(r => r.Users)
                .HasForeignKey(u => u.RoleId)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<User>()
                .HasOne(u => u.restaurant)
                .WithMany(r => r.Users)
                .HasForeignKey(u => u.RestaurantId)
                .OnDelete(DeleteBehavior.Restrict);

            // ================== Restaurant - User ==================
            modelBuilder.Entity<Restaurant>()
                .HasOne(r => r.CreatedUser)
                .WithMany()
                .HasForeignKey(r => r.CreatedUserId)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<Restaurant>()
                .HasOne(r => r.UpdatedUser)
                .WithMany()
                .HasForeignKey(r => r.UpdatedUserId)
                .OnDelete(DeleteBehavior.Restrict);

            // ================== Role - User ==================
            modelBuilder.Entity<Role>()
                .HasOne(r => r.CreatedUser)
                .WithMany()
                .HasForeignKey(r => r.CreatedUserId)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<Role>()
                .HasOne(r => r.UpdatedUser)
                .WithMany()
                .HasForeignKey(r => r.UpdatedUserId)
                .OnDelete(DeleteBehavior.Restrict);

            // ================== GuestTable ==================
            modelBuilder.Entity<GuestTable>()
                .HasOne(gt => gt.Status)
                .WithMany()
                .HasForeignKey(gt => gt.StatusId);

            modelBuilder.Entity<GuestTable>()
                .HasOne(gt => gt.Guest)
                .WithMany()
                .HasForeignKey(gt => gt.GuestId);


            // ================== Order ==================
            modelBuilder.Entity<Order>()
                .HasOne(o => o.CreatedUser)
                .WithMany()
                .HasForeignKey(o => o.CreatedUserId)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<Order>()
                .HasOne(o => o.UpdatedUser)
                .WithMany()
                .HasForeignKey(o => o.UpdatedUserId)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<Order>()
               .HasOne(o => o.GuestTable)
               .WithMany(gt => gt.Orders)
               .HasForeignKey(o => o.GuestTableId)
               .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<Order>()
                .HasOne(o => o.Status)
                .WithMany()
                .HasForeignKey(o => o.StatusId)
                .OnDelete(DeleteBehavior.Restrict);

            // ================== Payment ==================
            modelBuilder.Entity<Payment>()
                .HasOne(p => p.Order)
                .WithMany()
                .HasForeignKey(p => p.OrderId)
                .OnDelete(DeleteBehavior.Cascade);

            // ================== Order - OrderItem ==================
            modelBuilder.Entity<OrderItem>()
                .HasOne(oi => oi.Order)
                .WithMany(o => o.OrderItems)
                .HasForeignKey(oi => oi.OrderId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<OrderItem>()
                .HasOne(oi => oi.Item)
                .WithMany() // Hoặc .WithMany(i => i.OrderItems) nếu bạn có navigation trong Item
                .HasForeignKey(oi => oi.ItemId)
                .OnDelete(DeleteBehavior.Restrict);

            // ================== Item ==================
            modelBuilder.Entity<Item>()
                .HasOne(i => i.Unit)
                .WithMany()
                .HasForeignKey(i => i.UnitId)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<Item>()
                .HasOne(i => i.Category)
                .WithMany()
                .HasForeignKey(i => i.CategoryId)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<ItemImage>()
                 .HasOne(img => img.Item) // ItemImage có MỘT Item
                 .WithMany(i => i.ItemImages) // Item có NHIỀU ItemImage
                 .HasForeignKey(img => img.ItemId) // Khóa ngoại là ItemId
                 .OnDelete(DeleteBehavior.SetNull);

            // ================== Category ==================
            modelBuilder.Entity<Category>()
                .HasOne<Category>()
                .WithMany()
                .HasForeignKey(c => c.parentId)
                .OnDelete(DeleteBehavior.Restrict);
            modelBuilder.Entity<Order>()
                .HasOne(o => o.Guest)
                .WithMany(g => g.Orders)
                .HasForeignKey(o => o.GuestId)
                .OnDelete(DeleteBehavior.Restrict);
            // === THÊM CẤU HÌNH CHO Ingredient ===
            modelBuilder.Entity<Ingredient>()
                .Property(i => i.Unit)
                .IsRequired();

            // === THÊM CẤU HÌNH CHO Recipe ===
            modelBuilder.Entity<Recipe>()
                .HasOne(r => r.Item)
                .WithMany()
                .HasForeignKey(r => r.ItemId)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<Recipe>()
                .HasOne(r => r.Ingredient)
                .WithMany()
                .HasForeignKey(r => r.IngredientId)
                .OnDelete(DeleteBehavior.Restrict);

            // Tạo unique constraint cho cặp ItemId + IngredientId
            modelBuilder.Entity<Recipe>()
                .HasIndex(r => new { r.ItemId, r.IngredientId })
                .IsUnique();

            // ================== WorkShift ==================
            modelBuilder.Entity<WorkShift>()
                .HasOne(ws => ws.User)
                .WithMany()
                .HasForeignKey(ws => ws.UserId)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<WorkShift>()
                .HasOne(ws => ws.Shift)
                .WithMany()
                .HasForeignKey(ws => ws.ShiftId)
                .OnDelete(DeleteBehavior.Restrict);

            // OrderItem - Status
            modelBuilder.Entity<OrderItem>()
                .HasOne(oi => oi.CookingStatus)
                .WithMany()
                .HasForeignKey(oi => oi.CookingStatusId)
                .OnDelete(DeleteBehavior.Restrict);
        }


    }
}
