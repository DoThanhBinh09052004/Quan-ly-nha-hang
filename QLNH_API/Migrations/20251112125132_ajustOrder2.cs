using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace QLNH_API.Migrations
{
    /// <inheritdoc />
    public partial class ajustOrder2 : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<double>(
                name: "ChangeAmount",
                table: "Order",
                type: "double",
                nullable: false,
                defaultValue: 0.0);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "ChangeAmount",
                table: "Order");
        }
    }
}
