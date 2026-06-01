using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CloudStorage.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddLifecycleAndObjectMetadata : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "ObjectMetadata",
                columns: table => new
                {
                    Key = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    TenantId = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    ObjectId = table.Column<Guid>(type: "uuid", nullable: false),
                    Size = table.Column<long>(type: "bigint", nullable: false),
                    RootHash = table.Column<string>(type: "text", nullable: false),
                    ChunkHashesJson = table.Column<string>(type: "text", nullable: false),
                    CurrentTier = table.Column<string>(type: "text", nullable: false),
                    TagsJson = table.Column<string>(type: "text", nullable: false),
                    LastModified = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ObjectMetadata", x => new { x.Key, x.TenantId });
                });

            migrationBuilder.CreateTable(
                name: "StorageObjectLifecycles",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    FileId = table.Column<Guid>(type: "uuid", nullable: false),
                    ObjectKey = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    ProviderName = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    CurrentTier = table.Column<int>(type: "integer", nullable: false),
                    LastAccessedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_StorageObjectLifecycles", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_StorageObjectLifecycles_FileId",
                table: "StorageObjectLifecycles",
                column: "FileId");

            migrationBuilder.CreateIndex(
                name: "IX_StorageObjectLifecycles_ObjectKey",
                table: "StorageObjectLifecycles",
                column: "ObjectKey");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ObjectMetadata");

            migrationBuilder.DropTable(
                name: "StorageObjectLifecycles");
        }
    }
}
