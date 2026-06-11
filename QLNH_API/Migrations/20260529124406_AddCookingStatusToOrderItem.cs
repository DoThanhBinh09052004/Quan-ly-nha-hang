using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace QLNH_API.Migrations
{
    /// <inheritdoc />
    public partial class AddCookingStatusToOrderItem : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "CompletedAt",
                table: "OrderItem",
                type: "datetime(6)",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "CookingStatusId",
                table: "OrderItem",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "KitchenNote",
                table: "OrderItem",
                type: "longtext",
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateIndex(
                name: "IX_OrderItem_CookingStatusId",
                table: "OrderItem",
                column: "CookingStatusId");

            migrationBuilder.AddForeignKey(
                name: "FK_OrderItem_Status_CookingStatusId",
                table: "OrderItem",
                column: "CookingStatusId",
                principalTable: "Status",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_OrderItem_Status_CookingStatusId",
                table: "OrderItem");

            migrationBuilder.DropIndex(
                name: "IX_OrderItem_CookingStatusId",
                table: "OrderItem");

            migrationBuilder.DropColumn(
                name: "CompletedAt",
                table: "OrderItem");

            migrationBuilder.DropColumn(
                name: "CookingStatusId",
                table: "OrderItem");

            migrationBuilder.DropColumn(
                name: "KitchenNote",
                table: "OrderItem");
        }
    }
}
