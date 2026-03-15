using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CloudStorage.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class HighConcurrencyIndexes : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateIndex(
                name: "IX_SyncEvents_DeviceId_Timestamp",
                table: "SyncEvents",
                columns: new[] { "DeviceId", "Timestamp" });

            migrationBuilder.CreateIndex(
                name: "IX_FileMetadata_OwnerId_Status_IsDeleted",
                table: "FileMetadata",
                columns: new[] { "OwnerId", "Status", "IsDeleted" });

            migrationBuilder.CreateIndex(
                name: "IX_FileMetadata_UploadSessionId",
                table: "FileMetadata",
                column: "UploadSessionId");

            migrationBuilder.CreateIndex(
                name: "IX_FileChunks_Hash_FileMetadataId",
                table: "FileChunks",
                columns: new[] { "Hash", "FileMetadataId" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_SyncEvents_DeviceId_Timestamp",
                table: "SyncEvents");

            migrationBuilder.DropIndex(
                name: "IX_FileMetadata_OwnerId_Status_IsDeleted",
                table: "FileMetadata");

            migrationBuilder.DropIndex(
                name: "IX_FileMetadata_UploadSessionId",
                table: "FileMetadata");

            migrationBuilder.DropIndex(
                name: "IX_FileChunks_Hash_FileMetadataId",
                table: "FileChunks");
        }
    }
}
