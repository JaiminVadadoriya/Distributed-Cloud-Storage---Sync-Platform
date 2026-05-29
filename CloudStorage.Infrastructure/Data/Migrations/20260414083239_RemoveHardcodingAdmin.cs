using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CloudStorage.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class RemoveHardcodingAdmin : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<long>(
                name: "StorageQuota",
                table: "Users",
                type: "bigint",
                nullable: false,
                defaultValue: 0L);

            migrationBuilder.AddColumn<string>(
                name: "IpAddress",
                table: "ActivityLogs",
                type: "text",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "StorageQuota",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "IpAddress",
                table: "ActivityLogs");
        }
    }
}
