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

        public DbSet<Category> Category { get; set; }
        public DbSet<Expense> Expense { get; set; }
        public DbSet<ExpenseCategory> ExpenseCategory { get; set; }
        public DbSet<Guest> Guest { get; set; }
        public DbSet<GuestTable> GuestTable { get; set; }
        public DbSet<Ingredient> Ingredient { get; set; }
        public DbSet<Item> Item { get; set; }
        public DbSet<ItemImage> ItemImage { get; set; }
        public DbSet<Order> Order { get; set; }
        public DbSet<OrderItem> OrderItem { get; set; }
        public DbSet<Payment> Payment { get; set; }
        public DbSet<Recipe> Recipe { get; set; }
        public DbSet<Restaurant> Restaurant { get; set; }
        public DbSet<Role> Role { get; set; }
        public DbSet<Shift> Shift { get; set; }
        public DbSet<Status> Status { get; set; }
        public DbSet<Unit> Unit { get; set; }
        public DbSet<User> User { get; set; }
        public DbSet<WorkShift> WorkShift { get; set; }
        public DbSet<Reservation> Reservation { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            modelBuilder.Entity<Category>().ToTable("category");
            modelBuilder.Entity<Expense>().ToTable("expense");
            modelBuilder.Entity<ExpenseCategory>().ToTable("expensecategory");
            modelBuilder.Entity<Guest>().ToTable("guest");
            modelBuilder.Entity<GuestTable>().ToTable("guesttable");
            modelBuilder.Entity<Ingredient>().ToTable("ingredient");
            modelBuilder.Entity<Item>().ToTable("item");
            modelBuilder.Entity<ItemImage>().ToTable("itemimage");
            modelBuilder.Entity<Order>().ToTable("order");
            modelBuilder.Entity<OrderItem>().ToTable("orderitem");
            modelBuilder.Entity<Payment>().ToTable("payment");
            modelBuilder.Entity<Recipe>().ToTable("recipe");
            modelBuilder.Entity<Restaurant>().ToTable("restaurant");
            modelBuilder.Entity<Role>().ToTable("role");
            modelBuilder.Entity<Shift>().ToTable("shift");
            modelBuilder.Entity<Status>().ToTable("status");
            modelBuilder.Entity<Unit>().ToTable("unit");
            modelBuilder.Entity<User>().ToTable("user");
            modelBuilder.Entity<WorkShift>().ToTable("workshift");
            modelBuilder.Entity<Reservation>().ToTable("reservation");

            modelBuilder.Entity<Reservation>()
                .HasOne(r => r.GuestTable)
                .WithMany(gt => gt.Reservations)
                .HasForeignKey(r => r.GuestTableId)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<Reservation>()
                .HasOne(r => r.Guest)
                .WithMany(g => g.Reservations)
                .HasForeignKey(r => r.GuestId)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<Reservation>()
                .HasIndex(r => new { r.GuestTableId, r.ReservationTime, r.Status });

            modelBuilder.Entity<Reservation>()
                .Property(r => r.Status)
                .HasMaxLength(30);

            // User relationships.
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

            modelBuilder.Entity<User>()
                .HasOne(u => u.CreatedUser)
                .WithMany()
                .HasForeignKey(u => u.CreatedUserId)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<User>()
                .HasOne(u => u.UpdatedUser)
                .WithMany()
                .HasForeignKey(u => u.UpdatedUserId)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<User>()
                .Property(u => u.ShiftSalary)
                .HasPrecision(18, 2)
                .HasDefaultValue(0m);

            // Restaurant relationships.
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

            // Role relationships.
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

            // Guest table relationships.
            modelBuilder.Entity<GuestTable>()
                .HasOne(gt => gt.Status)
                .WithMany()
                .HasForeignKey(gt => gt.StatusId);

            modelBuilder.Entity<GuestTable>()
                .HasOne(gt => gt.Guest)
                .WithMany()
                .HasForeignKey(gt => gt.GuestId);

            // Order relationships.
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
                .HasOne(o => o.Guest)
                .WithMany(g => g.Orders)
                .HasForeignKey(o => o.GuestId)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<Order>()
                .HasOne(o => o.Status)
                .WithMany()
                .HasForeignKey(o => o.StatusId)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<Order>()
                .Property(o => o.TotalPrice)
                .HasPrecision(18, 2);

            modelBuilder.Entity<Order>()
                .Property(o => o.PaidAmount)
                .HasPrecision(18, 2);

            modelBuilder.Entity<Order>()
                .Property(o => o.ChangeAmount)
                .HasPrecision(18, 2);

            modelBuilder.Entity<Order>()
                .Property(o => o.Discount)
                .HasPrecision(18, 2);

            modelBuilder.Entity<Order>()
                .Property(o => o.FinalPrice)
                .HasPrecision(18, 2);

            modelBuilder.Entity<Order>()
                .Property(o => o.ActualCost)
                .HasPrecision(18, 2);

            modelBuilder.Entity<Order>()
                .Property(o => o.ActualProfit)
                .HasPrecision(18, 2);

            // Payment relationships.
            modelBuilder.Entity<Payment>()
                .HasOne(p => p.Order)
                .WithMany()
                .HasForeignKey(p => p.OrderId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<Payment>()
                .Property(p => p.Amount)
                .HasPrecision(18, 2);

            modelBuilder.Entity<Payment>()
                .HasIndex(p => p.TransactionId)
                .IsUnique();

            // Item relationships.
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

            modelBuilder.Entity<Item>()
                .Property(i => i.Profit)
                .HasPrecision(18, 2);

            modelBuilder.Entity<ItemImage>()
                .HasOne(img => img.Item)
                .WithMany(i => i.ItemImages)
                .HasForeignKey(img => img.ItemId)
                .OnDelete(DeleteBehavior.SetNull);

            modelBuilder.Entity<ExpenseCategory>()
                .HasIndex(ec => ec.Name)
                .IsUnique();

            modelBuilder.Entity<Expense>()
                .HasOne(e => e.ExpenseCategory)
                .WithMany(ec => ec.Expenses)
                .HasForeignKey(e => e.ExpenseCategoryId)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<Expense>()
                .Property(e => e.Amount)
                .HasPrecision(18, 2);

            // Recipe relationships.
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

            modelBuilder.Entity<Recipe>()
                .HasIndex(r => new { r.ItemId, r.IngredientId })
                .IsUnique();

            // Work shift relationships.
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

            modelBuilder.Entity<WorkShift>()
                .Property(ws => ws.PenaltyAmount)
                .HasPrecision(18, 2)
                .HasDefaultValue(0m);

            modelBuilder.Entity<OrderItem>()
                .HasOne(oi => oi.Order)
                .WithMany(o => o.OrderItems)
                .HasForeignKey(oi => oi.OrderId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<OrderItem>()
                .HasOne(oi => oi.Item)
                .WithMany()
                .HasForeignKey(oi => oi.ItemId)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<OrderItem>()
                .HasOne(oi => oi.CookingStatus)
                .WithMany()
                .HasForeignKey(oi => oi.CookingStatusId)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<Ingredient>()
                .Property(i => i.Unit)
                .IsRequired();

            modelBuilder.Entity<Ingredient>()
                .Property(i => i.RawMaterialCost)
                .HasPrecision(18, 2);

        }
    }
}
