using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace QLNH_API.Migrations
{
    /// <inheritdoc />
    public partial class ajust_order : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "PartySize",
                table: "Order",
                type: "int",
                nullable: false,
                defaultValue: 0);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "PartySize",
                table: "Order");
        }
    }
}
