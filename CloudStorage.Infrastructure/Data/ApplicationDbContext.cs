using CloudStorage.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace CloudStorage.Infrastructure.Data
{
    public class ApplicationDbContext : DbContext
    {
        public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options) : base(options) { }

        public DbSet<User> Users { get; set; }
        public DbSet<FileMetadata> FileMetadata { get; set; }
        public DbSet<RefreshToken> RefreshTokens { get; set; }
        public DbSet<Device> Devices { get; set; }
        public DbSet<FileChunk> FileChunks { get; set; }
        public DbSet<FilePermission> FilePermissions { get; set; }
        public DbSet<SyncEvent> SyncEvents { get; set; }
        public DbSet<ChunkRegistry> ChunkRegistry { get; set; }
        public DbSet<PasswordResetToken> PasswordResetTokens { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            // User configuration
            modelBuilder.Entity<User>(entity =>
            {
                entity.HasIndex(u => u.Email).IsUnique();
                entity.HasIndex(u => u.Username).IsUnique();
                entity.Property(u => u.Username).IsRequired().HasMaxLength(50);
                entity.Property(u => u.Email).IsRequired().HasMaxLength(255);
            });

            // FileMetadata configuration
            modelBuilder.Entity<FileMetadata>(entity =>
            {
                entity.HasOne(f => f.Owner)
                    .WithMany()
                    .HasForeignKey(f => f.OwnerId)
                    .OnDelete(DeleteBehavior.Restrict);

                entity.HasIndex(f => f.OwnerId);
                entity.HasIndex(f => new { f.OwnerId, f.Status, f.IsDeleted });
                entity.HasIndex(f => f.Hash);
                entity.HasIndex(f => f.UploadSessionId);
                entity.Property(f => f.FileName).IsRequired().HasMaxLength(255);
            });

            // RefreshToken configuration
            modelBuilder.Entity<RefreshToken>(entity =>
            {
                entity.HasOne(rt => rt.User)
                    .WithMany(u => u.RefreshTokens)
                    .HasForeignKey(rt => rt.UserId)
                    .OnDelete(DeleteBehavior.Cascade);

                entity.HasIndex(rt => rt.Token).IsUnique();
                entity.HasIndex(rt => rt.UserId);
                entity.Property(rt => rt.Token).IsRequired();
            });

            // Device configuration
            modelBuilder.Entity<Device>(entity =>
            {
                entity.HasOne(d => d.User)
                    .WithMany(u => u.Devices)
                    .HasForeignKey(d => d.UserId)
                    .OnDelete(DeleteBehavior.Cascade);

                entity.HasIndex(d => d.UserId);
                entity.Property(d => d.DeviceName).IsRequired().HasMaxLength(100);
                entity.Property(d => d.DeviceType).IsRequired().HasMaxLength(50);
            });

            // FileChunk configuration
            modelBuilder.Entity<FileChunk>(entity =>
            {
                entity.HasOne(fc => fc.FileMetadata)
                    .WithMany(f => f.Chunks)
                    .HasForeignKey(fc => fc.FileMetadataId)
                    .OnDelete(DeleteBehavior.Cascade);

                entity.HasIndex(fc => fc.FileMetadataId);
                entity.HasIndex(fc => fc.Hash);
                entity.HasIndex(fc => new { fc.Hash, fc.FileMetadataId });
                entity.HasIndex(fc => new { fc.FileMetadataId, fc.ChunkIndex }).IsUnique();
                entity.Property(fc => fc.Hash).IsRequired();
                entity.Property(fc => fc.StoragePath).IsRequired();
            });

            // FilePermission configuration
            modelBuilder.Entity<FilePermission>(entity =>
            {
                entity.HasOne(fp => fp.FileMetadata)
                    .WithMany(f => f.Permissions)
                    .HasForeignKey(fp => fp.FileMetadataId)
                    .OnDelete(DeleteBehavior.Cascade);

                entity.HasOne(fp => fp.User)
                    .WithMany(u => u.FilePermissions)
                    .HasForeignKey(fp => fp.UserId)
                    .OnDelete(DeleteBehavior.Restrict);

                entity.HasIndex(fp => fp.FileMetadataId);
                entity.HasIndex(fp => fp.UserId);
                entity.HasIndex(fp => new { fp.FileMetadataId, fp.UserId }).IsUnique();
            });

            // SyncEvent configuration
            modelBuilder.Entity<SyncEvent>(entity =>
            {
                entity.HasOne(se => se.FileMetadata)
                    .WithMany(f => f.SyncEvents)
                    .HasForeignKey(se => se.FileMetadataId)
                    .OnDelete(DeleteBehavior.Cascade);

                entity.HasOne(se => se.Device)
                    .WithMany()
                    .HasForeignKey(se => se.DeviceId)
                    .OnDelete(DeleteBehavior.Restrict);

                entity.HasIndex(se => se.FileMetadataId);
                entity.HasIndex(se => se.DeviceId);
                entity.HasIndex(se => se.Timestamp);
                entity.HasIndex(se => new { se.DeviceId, se.Timestamp });
            });

            // ChunkRegistry configuration
            modelBuilder.Entity<ChunkRegistry>(entity =>
            {
                entity.HasKey(cr => cr.Hash);
                entity.Property(cr => cr.Hash).IsRequired().HasMaxLength(64);
                entity.Property(cr => cr.StoragePath).IsRequired().HasMaxLength(500);
                entity.HasIndex(cr => cr.Hash).IsUnique();
            });

            // PasswordResetToken configuration
            modelBuilder.Entity<PasswordResetToken>(entity =>
            {
                entity.HasOne(prt => prt.User)
                    .WithMany()
                    .HasForeignKey(prt => prt.UserId)
                    .OnDelete(DeleteBehavior.Cascade);

                entity.HasIndex(prt => prt.TokenHash).IsUnique();
                entity.HasIndex(prt => prt.UserId);
                entity.Property(prt => prt.TokenHash).IsRequired().HasMaxLength(128);
            });

            base.OnModelCreating(modelBuilder);
        }
    }
}
