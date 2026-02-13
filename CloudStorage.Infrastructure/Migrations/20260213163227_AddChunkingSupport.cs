using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CloudStorage.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddChunkingSupport : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.RenameColumn(
                name: "BlobPath",
                table: "FileChunks",
                newName: "StoragePath");

            migrationBuilder.AddColumn<int>(
                name: "Status",
                table: "FileMetadata",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<string>(
                name: "UploadSessionId",
                table: "FileMetadata",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<int>(
                name: "UploadedChunks",
                table: "FileMetadata",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<string>(
                name: "DuplicateSourceId",
                table: "FileChunks",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "IsDuplicate",
                table: "FileChunks",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<DateTime>(
                name: "UploadedAt",
                table: "FileChunks",
                type: "timestamp with time zone",
                nullable: false,
                defaultValue: new DateTime(1, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified));

            migrationBuilder.CreateTable(
                name: "ChunkRegistry",
                columns: table => new
                {
                    Hash = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    StoragePath = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    Size = table.Column<long>(type: "bigint", nullable: false),
                    ReferenceCount = table.Column<int>(type: "integer", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ChunkRegistry", x => x.Hash);
                });

            migrationBuilder.CreateIndex(
                name: "IX_ChunkRegistry_Hash",
                table: "ChunkRegistry",
                column: "Hash",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ChunkRegistry");

            migrationBuilder.DropColumn(
                name: "Status",
                table: "FileMetadata");

            migrationBuilder.DropColumn(
                name: "UploadSessionId",
                table: "FileMetadata");

            migrationBuilder.DropColumn(
                name: "UploadedChunks",
                table: "FileMetadata");

            migrationBuilder.DropColumn(
                name: "DuplicateSourceId",
                table: "FileChunks");

            migrationBuilder.DropColumn(
                name: "IsDuplicate",
                table: "FileChunks");

            migrationBuilder.DropColumn(
                name: "UploadedAt",
                table: "FileChunks");

            migrationBuilder.RenameColumn(
                name: "StoragePath",
                table: "FileChunks",
                newName: "BlobPath");
        }
    }
}
