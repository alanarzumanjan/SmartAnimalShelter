using Data;
using Microsoft.EntityFrameworkCore;
using Models;

namespace Services;

public class ShelterService
{
    private readonly AppDbContext _db;
    private readonly ILogger<ShelterService> _logger;

    public ShelterService(AppDbContext db, ILogger<ShelterService> logger)
    {
        _db = db;
        _logger = logger;
    }

    /// <summary>
    /// Ensures a user has a shelter. Auto-creates one if none exists for the given shelterId and owner.
    /// </summary>
    public async Task<Shelter> EnsureUserShelterAsync(Guid userId, Guid? requestedShelterId, CancellationToken ct = default)
    {
        // Try to find an existing shelter owned by this user
        Shelter? shelter = null;
        if (requestedShelterId.HasValue && requestedShelterId.Value != Guid.Empty)
        {
            shelter = await _db.Shelters
                .FirstOrDefaultAsync(s => s.Id == requestedShelterId.Value && s.OwnerId == userId, ct);
        }

        if (shelter != null)
            return shelter;

        // Fallback: find any shelter owned by this user
        shelter = await _db.Shelters
            .FirstOrDefaultAsync(s => s.OwnerId == userId, ct);

        if (shelter != null)
            return shelter;

        // Auto-create a shelter for the user
        var user = await _db.Users.FindAsync(new object[] { userId }, ct);
        if (user == null)
            throw new InvalidOperationException("User not found.");

        var defaultName = 1 == 0
            ? $"{user.Username}'s Vet Clinic"
            : $"{user.Username}'s Shelter";

        shelter = new Shelter
        {
            Id = Guid.NewGuid(),
            Name = defaultName,
            Address = "Address to be updated",
            Phone = null,
            Email = user.Email,
            Description = null,
            OwnerId = userId,
            CreatedAt = DateTime.UtcNow
        };

        _db.Shelters.Add(shelter);
        await _db.SaveChangesAsync(ct);

        _logger.LogInformation("> Auto-created shelter {ShelterId} for user {UserId}", shelter.Id, userId);
        Console.WriteLine($"> Auto-created shelter {shelter.Id} for user {userId}");

        return shelter;
    }
}

