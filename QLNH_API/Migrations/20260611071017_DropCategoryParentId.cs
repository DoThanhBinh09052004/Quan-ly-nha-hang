using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace QLNH_API.Migrations
{
    /// <inheritdoc />
    public partial class DropCategoryParentId : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
                SET @fk_name := (
                    SELECT CONSTRAINT_NAME
                    FROM information_schema.KEY_COLUMN_USAGE
                    WHERE TABLE_SCHEMA = DATABASE()
                      AND TABLE_NAME = 'Category'
                      AND COLUMN_NAME = 'parentId'
                      AND REFERENCED_TABLE_NAME IS NOT NULL
                    LIMIT 1
                );

                SET @drop_fk_sql := IF(
                    @fk_name IS NULL,
                    'SELECT 1',
                    CONCAT('ALTER TABLE `Category` DROP FOREIGN KEY `', @fk_name, '`')
                );

                PREPARE stmt FROM @drop_fk_sql;
                EXECUTE stmt;
                DEALLOCATE PREPARE stmt;
            ");

            migrationBuilder.Sql(@"
                SET @idx_name := (
                    SELECT INDEX_NAME
                    FROM information_schema.STATISTICS
                    WHERE TABLE_SCHEMA = DATABASE()
                      AND TABLE_NAME = 'Category'
                      AND COLUMN_NAME = 'parentId'
                      AND INDEX_NAME <> 'PRIMARY'
                    LIMIT 1
                );

                SET @drop_idx_sql := IF(
                    @idx_name IS NULL,
                    'SELECT 1',
                    CONCAT('ALTER TABLE `Category` DROP INDEX `', @idx_name, '`')
                );

                PREPARE stmt2 FROM @drop_idx_sql;
                EXECUTE stmt2;
                DEALLOCATE PREPARE stmt2;
            ");

            migrationBuilder.DropColumn(
                name: "parentId",
                table: "Category");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "parentId",
                table: "Category",
                type: "int",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Category_parentId",
                table: "Category",
                column: "parentId");

            migrationBuilder.AddForeignKey(
                name: "FK_Category_Parent_CategoryId",
                table: "Category",
                column: "parentId",
                principalTable: "Category",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }
    }
}
