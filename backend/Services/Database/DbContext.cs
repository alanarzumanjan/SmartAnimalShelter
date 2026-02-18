using Microsoft.EntityFrameworkCore;
using Models;

namespace Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options)
        : base(options) { }

    // Users & Auth
    public DbSet<User> Users => Set<User>();
    
    // Shelter Management
    public DbSet<Shelter> Shelters => Set<Shelter>();
    public DbSet<Enclosure> Enclosures => Set<Enclosure>();
    public DbSet<Species> Species => Set<Species>();
    public DbSet<Breed> Breeds => Set<Breed>();
    public DbSet<Gender> Genders => Set<Gender>();
    public DbSet<AdoptionStatus> AdoptionStatuses => Set<AdoptionStatus>();
    public DbSet<Pet> Pets => Set<Pet>();
    public DbSet<AdoptionRequest> AdoptionRequests => Set<AdoptionRequest>();
    public DbSet<Favorite> Favorites => Set<Favorite>();
    public DbSet<News> News => Set<News>();
    public DbSet<Review> Reviews => Set<Review>();
    
    // IoT Sensors
    public DbSet<Device> Devices => Set<Device>();
    public DbSet<Measurement> Measurements => Set<Measurement>();
    public DbSet<DeviceUser> DeviceUsers => Set<DeviceUser>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);
        
        modelBuilder.Entity<Device>()
            .HasAlternateKey(d => d.DeviceId);

        // Configure relationships
        modelBuilder.Entity<Shelter>()
            .HasOne(s => s.Owner)
            .WithMany(u => u.OwnedShelters)
            .HasForeignKey(s => s.OwnerId);
            
        modelBuilder.Entity<Enclosure>()
            .HasOne(e => e.Shelter)
            .WithMany(s => s.Enclosures)
            .HasForeignKey(e => e.ShelterId);
            
        modelBuilder.Entity<Pet>()
            .HasOne(p => p.Shelter)
            .WithMany(s => s.Pets)
            .HasForeignKey(p => p.ShelterId);
            
        modelBuilder.Entity<Pet>()
            .HasOne(p => p.Enclosure)
            .WithMany(e => e.Pets)
            .HasForeignKey(p => p.EnclosureId)
            .OnDelete(DeleteBehavior.SetNull);
            
        modelBuilder.Entity<Device>()
            .HasOne(d => d.User)
            .WithMany(u => u.Devices)
            .HasForeignKey(d => d.UserId);
            
        modelBuilder.Entity<Device>()
            .HasOne(d => d.Shelter)
            .WithMany()
            .HasForeignKey(d => d.ShelterId)
            .OnDelete(DeleteBehavior.SetNull);
            
        modelBuilder.Entity<Device>()
            .HasOne(d => d.Enclosure)
            .WithMany(e => e.Devices)
            .HasForeignKey(d => d.EnclosureId)
            .OnDelete(DeleteBehavior.SetNull);
            
        modelBuilder.Entity<Measurement>()
            .HasOne(m => m.Device)
            .WithMany(d => d.Measurements)
            .HasForeignKey(m => m.DeviceId)
            .HasPrincipalKey(d => d.DeviceId);
            
        modelBuilder.Entity<Measurement>()
            .HasOne(m => m.User)
            .WithMany(u => u.Measurements)
            .HasForeignKey(m => m.UserId);
            
        modelBuilder.Entity<DeviceUser>()
            .HasOne(du => du.Device)
            .WithMany(d => d.DeviceUsers)
            .HasForeignKey(du => du.DeviceId)
            .HasPrincipalKey(d => d.DeviceId);
    }
}