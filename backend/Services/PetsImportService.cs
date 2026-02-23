using Microsoft.EntityFrameworkCore;
using Services;
using Models;
using Data;

public class PetImportBackgroundService : BackgroundService
{
    private readonly IServiceScopeFactory _scopeFactory;

    public PetImportBackgroundService(IServiceScopeFactory scopeFactory)
    {
        _scopeFactory = scopeFactory;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            using var scope = _scopeFactory.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var parser = scope.ServiceProvider.GetRequiredService<PetParser>();

            try
            {
                var systemShelter = await EnsureSystemUserAndShelterAsync(db);

                var parsedPets = await parser.ParseFromSsLvAsync(systemShelter.Id);

                List<Pet> newPets = new();
                HashSet<string> urlsInBatch = new();

                foreach (var pet in parsedPets)
                {
                    if (string.IsNullOrWhiteSpace(pet.ExternalUrl))
                        continue;
                    if (urlsInBatch.Contains(pet.ExternalUrl))
                        continue;

                    bool exists = await db.Pets.AnyAsync(x => x.ExternalUrl == pet.ExternalUrl);
                    if (!exists)
                        newPets.Add(pet);
                }

                using var transaction = await db.Database.BeginTransactionAsync();
                await db.Pets.AddRangeAsync(newPets);
                await db.SaveChangesAsync();
                await transaction.CommitAsync();

                Console.WriteLine($"✅ Imported {newPets.Count} new pets at {DateTime.Now}");
                int totalPets = await db.Pets.CountAsync();
                Console.WriteLine($"📊 Total pets in database: {totalPets}\n");

                await Task.Delay(1000);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"❌ Error during import: {ex.Message}");
            }

            await Task.Delay(TimeSpan.FromMinutes(60), stoppingToken);
        }
    }

    private async Task<Shelter> EnsureSystemUserAndShelterAsync(AppDbContext db)
    {
        string? encryptedEmail = EncryptionService.Encrypt("ss@parser.local");
        
        var existingShelter = await db.Shelters.FirstOrDefaultAsync(s => s.Email == encryptedEmail);
        if (existingShelter != null)
            return existingShelter;

        var existingUser = await db.Users.FirstOrDefaultAsync(
            u => u.Email == encryptedEmail || u.Username == "ss.lv parser"
        );

        User user;
        
        if (existingUser != null)
        {
            user = existingUser;
        }
        else
        {
            user = new User
            {
                Id = Guid.NewGuid(),
                Username = "ss.lv parser"!,
                Email = encryptedEmail!,
                PasswordHash = string.Empty,
                Role = "shelter_owner"!,
                CreatedAt = DateTime.UtcNow
            };
            db.Users.Add(user);
            await db.SaveChangesAsync();
        }

        var shelter = new Shelter
        {
            Id = Guid.NewGuid(),
            ShelterOwnerId = user.Id,
            OwnerId = user.Id,
            Name = "Imported from ss.lv"!,
            Email = encryptedEmail!,
            Address = "internet",
            Phone = "0000",
            Description = "Dates from website",
            CreatedAt = DateTime.UtcNow
        };

        db.Shelters.Add(shelter);
        await db.SaveChangesAsync();

        return shelter;
    }
}