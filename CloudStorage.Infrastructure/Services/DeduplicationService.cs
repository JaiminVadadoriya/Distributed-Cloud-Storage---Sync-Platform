using System;
using System.Linq;
using System.Threading.Tasks;
using CloudStorage.Application.Interfaces;
using CloudStorage.Domain.Entities;
using CloudStorage.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

using CloudStorage.Application.Interfaces.Storage;

namespace CloudStorage.Infrastructure.Services
{
    public class DeduplicationService : IDeduplicationService
    {
        private readonly ApplicationDbContext _context;
        private readonly IChunkStorageProvider _chunkStorage;

        public DeduplicationService(ApplicationDbContext context, IChunkStorageProvider chunkStorage)
        {
            _context = context;
            _chunkStorage = chunkStorage;
        }

        public async Task<ChunkRegistry> RegisterChunkAsync(string hash, string storagePath, long size)
        {
            var existing = await _context.ChunkRegistry
                .FirstOrDefaultAsync(cr => cr.Hash == hash);

            if (existing != null)
            {
                // Chunk already exists, increment reference count
                existing.ReferenceCount++;
                await _context.SaveChangesAsync();
                return existing;
            }

            // New chunk, create registry entry
            var newEntry = new ChunkRegistry
            {
                Hash = hash,
                StoragePath = storagePath,
                Size = size,
                ReferenceCount = 1,
                CreatedAt = DateTime.UtcNow
            };

            _context.ChunkRegistry.Add(newEntry);
            await _context.SaveChangesAsync();

            return newEntry;
        }

        public async Task<bool> IsChunkDuplicateAsync(string hash)
        {
            return await _context.ChunkRegistry
                .AnyAsync(cr => cr.Hash == hash);
        }

        public async Task DecrementReferenceAsync(string hash)
        {
            var entry = await _context.ChunkRegistry
                .FirstOrDefaultAsync(cr => cr.Hash == hash);

            if (entry == null)
                return;

            entry.ReferenceCount--;

            if (entry.ReferenceCount <= 0)
            {
                // No more references, delete the chunk
                _context.ChunkRegistry.Remove(entry);
                await _chunkStorage.DeleteChunkAsync(entry.StoragePath);
            }

            await _context.SaveChangesAsync();
        }
    }
}
