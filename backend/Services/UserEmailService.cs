using Microsoft.EntityFrameworkCore;
using Data;
using Models;

namespace Services;

public sealed class UserEmailService
{
    private readonly AppDbContext _db;

    public UserEmailService(AppDbContext db)
    {
        _db = db;
    }

    public async Task<bool> EmailExistsAsync(string email, Guid? excludeUserId = null, CancellationToken cancellationToken = default)
    {
        var normalizedEmail = EncryptionService.NormalizeEmail(email);
        if (normalizedEmail == null)
            return false;

        var query = _db.Users.AsNoTracking();
        if (excludeUserId.HasValue)
            query = query.Where(u => u.Id != excludeUserId.Value);

        var users = await query
            .Select(u => new UserEmailLookup(u.Id, u.Email))
            .ToListAsync(cancellationToken);

        return users.Any(u => EncryptionService.EmailMatchesEncryptedValue(u.Email, normalizedEmail));
    }

    public async Task<User?> FindByEmailAsync(string email, bool asNoTracking = false, CancellationToken cancellationToken = default)
    {
        var normalizedEmail = EncryptionService.NormalizeEmail(email);
        if (normalizedEmail == null)
            return null;

        IQueryable<User> query = _db.Users;
        if (asNoTracking)
            query = query.AsNoTracking();

        var users = await query.ToListAsync(cancellationToken);
        return users.FirstOrDefault(u => EncryptionService.EmailMatchesEncryptedValue(u.Email, normalizedEmail));
    }

    private sealed record UserEmailLookup(Guid Id, string Email);
}
