using CloudStorage.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Microsoft.Extensions.Logging;

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
        public DbSet<Folder> Folders { get; set; } = null!;
        public DbSet<ActivityLog> ActivityLogs { get; set; } = null!;
        public DbSet<FolderPermission> FolderPermissions { get; set; } = null!;
        public DbSet<Notification> Notifications { get; set; } = null!;
        public DbSet<StorageObjectLifecycle> StorageObjectLifecycles { get; set; } = null!;

        protected override void OnConfiguring(DbContextOptionsBuilder optionsBuilder)
        {
            // Set all warnings to Log behavior instead of Throw to prevent them from blocking migrations
            optionsBuilder.ConfigureWarnings(w => w.Default(WarningBehavior.Log));
            base.OnConfiguring(optionsBuilder);
        }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            // User configuration
            modelBuilder.Entity<User>(entity =>
            {
                entity.HasIndex(u => u.Email).IsUnique();
                entity.HasIndex(u => u.Username).IsUnique();
                entity.Property(u => u.Username).IsRequired().HasMaxLength(50);
                entity.Property(u => u.Email).IsRequired().HasMaxLength(255);
                entity.Property(u => u.Role).IsRequired().HasMaxLength(20).HasDefaultValue("User");
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

                entity.HasOne(f => f.Folder)
                    .WithMany(fol => fol.Files)
                    .HasForeignKey(f => f.FolderId)
                    .OnDelete(DeleteBehavior.Cascade);
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

            // Folder configuration
            modelBuilder.Entity<Folder>(entity =>
            {
                entity.HasOne(f => f.Owner)
                    .WithMany()
                    .HasForeignKey(f => f.OwnerId)
                    .OnDelete(DeleteBehavior.Restrict);

                entity.HasOne(f => f.ParentFolder)
                    .WithMany(f => f.SubFolders)
                    .HasForeignKey(f => f.ParentFolderId)
                    .OnDelete(DeleteBehavior.Cascade);

                entity.HasIndex(f => f.OwnerId);
                entity.HasIndex(f => f.ParentFolderId);
                entity.Property(f => f.Name).IsRequired().HasMaxLength(255);
            });

            // FolderPermission configuration
            modelBuilder.Entity<FolderPermission>(entity =>
            {
                entity.HasOne(fp => fp.Folder)
                    .WithMany(f => f.Permissions)
                    .HasForeignKey(fp => fp.FolderId)
                    .OnDelete(DeleteBehavior.Cascade);

                entity.HasOne(fp => fp.User)
                    .WithMany()
                    .HasForeignKey(fp => fp.UserId)
                    .OnDelete(DeleteBehavior.Restrict);

                entity.HasIndex(fp => fp.FolderId);
                entity.HasIndex(fp => fp.UserId);
                entity.HasIndex(fp => new { fp.FolderId, fp.UserId }).IsUnique();
            });

            // ActivityLog configuration
            modelBuilder.Entity<ActivityLog>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.Action).IsRequired().HasMaxLength(50);
                entity.Property(e => e.EntityType).IsRequired().HasMaxLength(50);
                entity.Property(e => e.Details).HasMaxLength(500);

                entity.HasOne(d => d.User)
                    .WithMany()
                    .HasForeignKey(d => d.UserId)
                    .OnDelete(DeleteBehavior.Cascade);

                entity.HasIndex(e => e.UserId);
                entity.HasIndex(e => e.Timestamp);
            });

            // Notification configuration
            modelBuilder.Entity<Notification>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.Title).IsRequired().HasMaxLength(200);
                entity.Property(e => e.Message).HasMaxLength(500);

                entity.HasOne(n => n.User)
                    .WithMany(u => u.Notifications)
                    .HasForeignKey(n => n.UserId)
                    .OnDelete(DeleteBehavior.Cascade);

                entity.HasIndex(n => n.UserId);
                entity.HasIndex(n => n.CreatedAt);
                entity.HasIndex(n => new { n.UserId, n.IsRead });
            });

            modelBuilder.Entity<StorageObjectLifecycle>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.HasIndex(e => e.FileId);
                entity.HasIndex(e => e.ObjectKey);
                entity.Property(e => e.ObjectKey).IsRequired().HasMaxLength(500);
                entity.Property(e => e.ProviderName).IsRequired().HasMaxLength(100);
            });

            base.OnModelCreating(modelBuilder);
        }
    }
}
