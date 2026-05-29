using CloudStorage.Domain.Entities;
using CloudStorage.Infrastructure.Data;
using CloudStorage.Tests.Builders;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace CloudStorage.Tests.Seeders
{
    public static class SeedData
    {
        public static async Task SeedAsync(ApplicationDbContext context)
        {
            if (await context.Users.AnyAsync()) return;

            // Personas
            var admin = new UserBuilder().WithId(2).Admin().WithUsername("admin").WithEmail("admin@cloudstorage.com").Build();
            var regularUser = new UserBuilder().WithId(1).WithUsername("regularuser").WithEmail("user@cloudstorage.com").Build();
            var guestUser = new UserBuilder().WithId(3).WithUsername("guest_user").WithRole("Guest").WithEmail("guest@cloudstorage.com").Build();

            context.Users.AddRange(admin, regularUser, guestUser);
            await context.SaveChangesAsync();

            // Devices
            var desktop = new DeviceBuilder().WithUserId(regularUser.Id).WithDeviceName("Work-PC").WithDeviceType("Desktop").Build();
            var mobile = new DeviceBuilder().WithUserId(regularUser.Id).WithDeviceName("iPhone-15").WithDeviceType("Mobile").Build();

            context.Devices.AddRange(desktop, mobile);

            // Folder Hierarchy
            var workFolder = new FolderBuilder().WithOwnerId(regularUser.Id).WithName("Work").Build();
            var photosFolder = new FolderBuilder().WithOwnerId(regularUser.Id).WithName("Photos").Build();

            context.Folders.AddRange(workFolder, photosFolder);
            await context.SaveChangesAsync();

            var projectAFolder = new FolderBuilder().WithOwnerId(regularUser.Id).WithName("ProjectA").WithParentFolderId(workFolder.Id).Build();
            context.Folders.Add(projectAFolder);
            await context.SaveChangesAsync();

            // Files
            var files = new List<FileMetadata>
            {
                new FileMetadataBuilder().WithOwnerId(regularUser.Id).WithFileName("manifest.json").WithFolderId(projectAFolder.Id).Build(),
                new FileMetadataBuilder().WithOwnerId(regularUser.Id).WithFileName("budget.xlsx").WithFolderId(workFolder.Id).Build(),
                new FileMetadataBuilder().WithOwnerId(regularUser.Id).WithFileName("vacation.jpg").WithFolderId(photosFolder.Id).Build(),
                new FileMetadataBuilder().WithOwnerId(regularUser.Id).WithFileName("notes.txt").Build(), // Root file
            };

            context.FileMetadata.AddRange(files);
            await context.SaveChangesAsync();
        }
    }
}
