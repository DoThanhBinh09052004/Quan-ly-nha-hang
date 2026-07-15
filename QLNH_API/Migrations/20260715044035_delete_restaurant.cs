using System;
using Microsoft.EntityFrameworkCore.Metadata;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace QLNH_API.Migrations
{
    /// <inheritdoc />
    public partial class delete_restaurant : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_user_restaurant_RestaurantId",
                table: "user");

            migrationBuilder.DropTable(
                name: "restaurant");

            migrationBuilder.DropIndex(
                name: "IX_user_RestaurantId",
                table: "user");

            migrationBuilder.DropColumn(
                name: "RestaurantId",
                table: "user");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "RestaurantId",
                table: "user",
                type: "int",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "restaurant",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn),
                    CreatedUserId = table.Column<int>(type: "int", nullable: true),
                    UpdatedUserId = table.Column<int>(type: "int", nullable: true),
                    Address = table.Column<string>(type: "longtext", nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    Created = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                    Deleted = table.Column<bool>(type: "tinyint(1)", nullable: false),
                    Description = table.Column<string>(type: "longtext", nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    Name = table.Column<string>(type: "longtext", nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    Phone = table.Column<string>(type: "longtext", nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    Updated = table.Column<DateTime>(type: "datetime(6)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_restaurant", x => x.Id);
                    table.ForeignKey(
                        name: "FK_restaurant_user_CreatedUserId",
                        column: x => x.CreatedUserId,
                        principalTable: "user",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_restaurant_user_UpdatedUserId",
                        column: x => x.UpdatedUserId,
                        principalTable: "user",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateIndex(
                name: "IX_user_RestaurantId",
                table: "user",
                column: "RestaurantId");

            migrationBuilder.CreateIndex(
                name: "IX_restaurant_CreatedUserId",
                table: "restaurant",
                column: "CreatedUserId");

            migrationBuilder.CreateIndex(
                name: "IX_restaurant_UpdatedUserId",
                table: "restaurant",
                column: "UpdatedUserId");

            migrationBuilder.AddForeignKey(
                name: "FK_user_restaurant_RestaurantId",
                table: "user",
                column: "RestaurantId",
                principalTable: "restaurant",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }
    }
}
