using Microsoft.EntityFrameworkCore;
using Services;
using Models;
using Data;

public class PetImportBackgroundService : BackgroundService
{
    // Used to create scoped services inside the background worker
    private readonly IServiceScopeFactory _scopeFactory;

    public PetImportBackgroundService(IServiceScopeFactory scopeFactory)
    {
        _scopeFactory = scopeFactory;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            // Create a new DI scope for this iteration
            using var scope = _scopeFactory.CreateScope();

            // Resolve required services
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var parser = scope.ServiceProvider.GetRequiredService<PetParser>();

            try
            {
                var systemUser = await EnsureSystemUserAsync(db);
                var systemShelter = await EnsureSystemShelterAsync(db, systemUser.Id);

                var parsedPets = await parser.ParseFromSsLvAsync(systemShelter.Id);

                // Filter out duplicates before saving
                List<Pet> newPets = new();
                HashSet<string> urlsInBatch = new();

                foreach (var pet in parsedPets)
                {
                    if (string.IsNullOrWhiteSpace(pet.ExternalUrl))
                    {
                        continue;
                    }
                    if (urlsInBatch.Contains(pet.ExternalUrl))
                    {
                        continue;
                    }

                    bool exists = await db.Pets.AnyAsync(x => x.ExternalUrl == pet.ExternalUrl);
                    if (!exists)
                        newPets.Add(pet); // Add only if not already in DB
                }

                // Save new pets in transaction
                using var transaction = await db.Database.BeginTransactionAsync();
                await db.Pets.AddRangeAsync(newPets);
                await db.SaveChangesAsync();
                await transaction.CommitAsync();

                Console.WriteLine($"✅ Imported {newPets.Count} new pets at {DateTime.Now}");
                int totalPets = await db.Pets.CountAsync();
                Console.WriteLine($"📊 Total pets in database: {totalPets}\n");

                // Optional short pause between imports
                await Task.Delay(1000);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"❌ Error during import: {ex}");
            }

            // Wait before next run (default 60 minutes)
            await Task.Delay(TimeSpan.FromMinutes(60), stoppingToken);
        }
    }

    private async Task<User> EnsureSystemUserAsync(AppDbContext db)
    {
        string? encryptedEmail = EncryptionService.Encrypt("ss@parser.local");

        // Check if user already exists
        var user = await db.Users.FirstOrDefaultAsync(u => u.Email == encryptedEmail);
        if (user != null)
            return user;

        var newUser = new User
        {
            Id = Guid.NewGuid(),
            Username = "ss.lv parser",
            Email = encryptedEmail,
            PasswordHash = "",
            Role = "shelter_owner"
        };

        // Transaction
        using var transaction = await db.Database.BeginTransactionAsync();
        await db.Users.AddAsync(newUser);
        await db.SaveChangesAsync();
        await transaction.CommitAsync();

        return newUser;
    }

    // Ensure system shelter is linked to system user
    private async Task<Shelter> EnsureSystemShelterAsync(AppDbContext db, Guid userId)
    {
        string? encryptedEmail = EncryptionService.Encrypt("ss@parser.local");
        var shelter = await db.Shelters.FirstOrDefaultAsync(s => s.Email == encryptedEmail);

        if (shelter != null)
            return shelter;

        var newShelter = new Shelter
        {
            Id = Guid.NewGuid(),
            ShelterOwnerId = userId,
            Name = "Imported from ss.lv",
            Email = encryptedEmail,
            Address = "internet", // Placeholder
            Phone = "0000",
            Description = "Dates from website",
            CreatedAt = DateTime.UtcNow
        };

        // Transaction
        using var transaction = await db.Database.BeginTransactionAsync();
        await db.Shelters.AddAsync(newShelter);
        await db.SaveChangesAsync();
        await transaction.CommitAsync();

        return newShelter;
    }
}
