using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace QLNH_API.Migrations
{
    /// <inheritdoc />
    public partial class updatedatabasen1 : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_ItemImage_Item_ItemId",
                table: "ItemImage");

            migrationBuilder.AddColumn<double>(
                name: "Discount",
                table: "Order",
                type: "double",
                nullable: false,
                defaultValue: 0.0);

            migrationBuilder.AddColumn<double>(
                name: "FinalPrice",
                table: "Order",
                type: "double",
                nullable: false,
                defaultValue: 0.0);

            migrationBuilder.AddColumn<int>(
                name: "GuestId",
                table: "Order",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "GuestPhone",
                table: "Order",
                type: "longtext",
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<int>(
                name: "Points",
                table: "Guest",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.CreateIndex(
                name: "IX_Order_GuestId",
                table: "Order",
                column: "GuestId");

            migrationBuilder.AddForeignKey(
                name: "FK_ItemImage_Item_ItemId",
                table: "ItemImage",
                column: "ItemId",
                principalTable: "Item",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.AddForeignKey(
                name: "FK_Order_Guest_GuestId",
                table: "Order",
                column: "GuestId",
                principalTable: "Guest",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_ItemImage_Item_ItemId",
                table: "ItemImage");

            migrationBuilder.DropForeignKey(
                name: "FK_Order_Guest_GuestId",
                table: "Order");

            migrationBuilder.DropIndex(
                name: "IX_Order_GuestId",
                table: "Order");

            migrationBuilder.DropColumn(
                name: "Discount",
                table: "Order");

            migrationBuilder.DropColumn(
                name: "FinalPrice",
                table: "Order");

            migrationBuilder.DropColumn(
                name: "GuestId",
                table: "Order");

            migrationBuilder.DropColumn(
                name: "GuestPhone",
                table: "Order");

            migrationBuilder.DropColumn(
                name: "Points",
                table: "Guest");

            migrationBuilder.AddForeignKey(
                name: "FK_ItemImage_Item_ItemId",
                table: "ItemImage",
                column: "ItemId",
                principalTable: "Item",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }
    }
}
