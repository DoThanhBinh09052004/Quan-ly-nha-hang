using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace QLNH_API.Migrations
{
    /// <inheritdoc />
    public partial class ajustdatabaseGuestTable : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "GuestTableId",
                table: "Order",
                type: "int",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Order_GuestTableId",
                table: "Order",
                column: "GuestTableId");

            migrationBuilder.AddForeignKey(
                name: "FK_Order_GuestTable_GuestTableId",
                table: "Order",
                column: "GuestTableId",
                principalTable: "GuestTable",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Order_GuestTable_GuestTableId",
                table: "Order");

            migrationBuilder.DropIndex(
                name: "IX_Order_GuestTableId",
                table: "Order");

            migrationBuilder.DropColumn(
                name: "GuestTableId",
                table: "Order");
        }
    }
}
