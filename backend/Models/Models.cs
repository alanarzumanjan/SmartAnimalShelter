using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Text.Json.Serialization;
using Microsoft.EntityFrameworkCore;

namespace Models;

[Index(nameof(Email), IsUnique = true)]
[Index(nameof(Username), IsUnique = true)]
public class User
{
    [Key]
    public Guid Id { get; init; } = Guid.NewGuid();

    [Required, MaxLength(128)]
    public string Username { get; set; } = null!;

    [Required, MaxLength(256), EmailAddress]
    public string Email { get; set; } = null!;

    [JsonIgnore, Required]
    public string PasswordHash { get; set; } = null!;

    [MaxLength(50)]
    public string Role { get; set; } = "user"; // admin | shelter_owner | user

    [Phone, MaxLength(50)]
    public string? Phone { get; set; }

    [MaxLength(255)]
    public string? Address { get; set; }

    public DateTime CreatedAt { get; init; } = DateTime.UtcNow;

    // Navigation properties
    [JsonIgnore]
    public ICollection<Shelter> OwnedShelters { get; init; } = new List<Shelter>();

    [JsonIgnore]
    public ICollection<Device> Devices { get; init; } = new List<Device>();

    [JsonIgnore]
    public ICollection<Measurement> Measurements { get; init; } = new List<Measurement>();

    [JsonIgnore]
    public ICollection<AdoptionRequest> AdoptionRequests { get; init; } = new List<AdoptionRequest>();

    [JsonIgnore]
    public ICollection<Favorite> Favorites { get; init; } = new List<Favorite>();

    [JsonIgnore]
    public ICollection<Review> Reviews { get; init; } = new List<Review>();
}

public class Shelter
{
    [Key]
    public Guid Id { get; init; } = Guid.NewGuid();

    [Required, MaxLength(255)]
    public string Name { get; set; } = null!;

    [Required, MaxLength(500)]
    public string Address { get; set; } = null!;

    [Phone, MaxLength(50)]
    public string? Phone { get; set; }

    [EmailAddress, MaxLength(255)]
    public string? Email { get; set; }

    [MaxLength(1000)]
    public string? Description { get; set; }

    [Required]
    public Guid OwnerId { get; set; }

    public DateTime CreatedAt { get; init; } = DateTime.UtcNow;

    // Navigation properties
    [ForeignKey(nameof(OwnerId))]
    public User Owner { get; set; } = null!;

    [JsonIgnore]
    public ICollection<Enclosure> Enclosures { get; init; } = new List<Enclosure>();

    [JsonIgnore]
    public ICollection<Pet> Pets { get; init; } = new List<Pet>();

    [JsonIgnore]
    public ICollection<News> News { get; init; } = new List<News>();

    [JsonIgnore]
    public ICollection<Review> Reviews { get; init; } = new List<Review>();
    public Guid ShelterOwnerId { get; internal set; }
}

public class Enclosure
{
    [Key]
    public Guid Id { get; init; } = Guid.NewGuid();

    [Required, MaxLength(100)]
    public string Name { get; set; } = null!; 

    [MaxLength(500)]
    public string? Description { get; set; }

    [Required]
    public Guid ShelterId { get; set; }

    public DateTime CreatedAt { get; init; } = DateTime.UtcNow;

    // Navigation properties
    [ForeignKey(nameof(ShelterId))]
    public Shelter Shelter { get; set; } = null!;

    [JsonIgnore]
    public ICollection<Device> Devices { get; init; } = new List<Device>();

    [JsonIgnore]
    public ICollection<Pet> Pets { get; init; } = new List<Pet>();
}

public class Species
{
    [Key]
    public int Id { get; init; }

    [Required, MaxLength(100)]
    public string Name { get; set; } = null!;

    [JsonIgnore]
    public ICollection<Breed> Breeds { get; init; } = new List<Breed>();

    [JsonIgnore]
    public ICollection<Pet> Pets { get; init; } = new List<Pet>();
}

public class Breed
{
    [Key]
    public int Id { get; init; }

    [Required]
    public int SpeciesId { get; set; }

    [Required, MaxLength(100)]
    public string Name { get; set; } = null!;

    [ForeignKey(nameof(SpeciesId))]
    public Species Species { get; set; } = null!;

    [JsonIgnore]
    public ICollection<Pet> Pets { get; init; } = new List<Pet>();
}

public class Gender
{
    [Key]
    public int Id { get; init; }

    [Required, MaxLength(50)]
    public string Name { get; set; } = null!;

    [JsonIgnore]
    public ICollection<Pet> Pets { get; init; } = new List<Pet>();
}

public class AdoptionStatus
{
    [Key]
    public int Id { get; init; }

    [Required, MaxLength(50)]
    public string Name { get; set; } = null!; // "available", "adopted", "reserved"

    [JsonIgnore]
    public ICollection<Pet> Pets { get; init; } = new List<Pet>();
}

public class Pet
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();

    [Required, MaxLength(100)]
    public string? Name { get; set; }

    [Required]
    public int SpeciesId { get; set; }

    [Required]
    public int BreedId { get; set; }

    public int? GenderId { get; set; }

    public float? Age { get; set; }

    [MaxLength(100)]
    public string? Color { get; set; }

    [Required]
    public int StatusId { get; set; }

    [MaxLength(1000)]
    public string? Description { get; set; }

    [MaxLength(1000)]
    public string? ImageUrl { get; set; }

    [MaxLength(255)]
    public string? MongoImageId { get; set; }

    [MaxLength(100)]
    public string? Category { get; set; } // "rodents/ferret"

    [MaxLength(50)]
    public string? Price { get; set; }

    [MaxLength(500)]
    public string? ExternalUrl { get; set; }

    [Required]
    public Guid ShelterId { get; set; }

    public Guid? EnclosureId { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Navigation properties
    [ForeignKey(nameof(SpeciesId))]
    public Species Species { get; set; } = null!;

    [ForeignKey(nameof(BreedId))]
    public Breed Breed { get; set; } = null!;

    [ForeignKey(nameof(GenderId))]
    public Gender? Gender { get; set; }

    [ForeignKey(nameof(StatusId))]
    public AdoptionStatus Status { get; set; } = null!;

    [ForeignKey(nameof(ShelterId))]
    public Shelter Shelter { get; set; } = null!;

    [ForeignKey(nameof(EnclosureId))]
    public Enclosure? Enclosure { get; set; }

    [JsonIgnore]
    public ICollection<AdoptionRequest> AdoptionRequests { get; init; } = new List<AdoptionRequest>();

    [JsonIgnore]
    public ICollection<Favorite> Favorites { get; init; } = new List<Favorite>();
}

public class AdoptionRequest
{
    [Key]
    public Guid Id { get; init; } = Guid.NewGuid();

    [Required]
    public Guid PetId { get; set; }

    [Required]
    public Guid UserId { get; set; }

    [MaxLength(1000)]
    public string? Message { get; set; }

    [Required, MaxLength(50)]
    public string Status { get; set; } = "pending"; // pending | approved | rejected

    public DateTime CreatedAt { get; init; } = DateTime.UtcNow;

    // Navigation properties
    [ForeignKey(nameof(PetId))]
    public Pet Pet { get; set; } = null!;

    [ForeignKey(nameof(UserId))]
    public User User { get; set; } = null!;
}

public class Favorite
{
    [Key]
    public Guid Id { get; init; } = Guid.NewGuid();

    [Required]
    public Guid UserId { get; set; }

    [Required]
    public Guid PetId { get; set; }

    public DateTime CreatedAt { get; init; } = DateTime.UtcNow;
    
    // Navigation properties
    [ForeignKey(nameof(UserId))]
    public User User { get; set; } = null!;

    [ForeignKey(nameof(PetId))]
    public Pet Pet { get; set; } = null!;
}

public class News
{
    [Key]
    public Guid Id { get; init; } = Guid.NewGuid();

    [Required, MaxLength(255)]
    public string Title { get; set; } = null!;

    [Required]
    public string Content { get; set; } = null!;

    [MaxLength(500)]
    public string? ImageUrl { get; set; }

    [Required]
    public Guid ShelterId { get; set; }

    public DateTime CreatedAt { get; init; } = DateTime.UtcNow;

    // Navigation properties
    [ForeignKey(nameof(ShelterId))]
    public Shelter Shelter { get; set; } = null!;
}

public class Review
{
    [Key]
    public Guid Id { get; init; } = Guid.NewGuid();

    [Required]
    public Guid UserId { get; set; }

    [Required]
    public Guid ShelterId { get; set; }

    [MaxLength(1000)]
    public string? Comment { get; set; }

    [Range(1, 5)]
    public int Rating { get; set; }

    public DateTime CreatedAt { get; init; } = DateTime.UtcNow;

    // Navigation properties
    [ForeignKey(nameof(UserId))]
    public User User { get; set; } = null!;

    [ForeignKey(nameof(ShelterId))]
    public Shelter Shelter { get; set; } = null!;
}

[Index(nameof(DeviceId), IsUnique = true)]
public class Device
{
    [Key]
    public Guid Id { get; init; } = Guid.NewGuid();

    [Required, MaxLength(17)]
    public string DeviceId { get; set; } = null!;

    [Required, MaxLength(128)]
    public string Name { get; set; } = null!;

    [Required, MaxLength(255)]
    public string Location { get; set; } = null!;

    [MaxLength(500)]
    public string? Description { get; set; }

    [Required]
    public Guid UserId { get; set; }

    public Guid? ShelterId { get; set; }

    public Guid? EnclosureId { get; set; }

    [MaxLength(200)]
    public string? ApiKeyHash { get; set; }

    public DateTime RegisteredAt { get; init; } = DateTime.UtcNow;

    public DateTime? LastSeenAt { get; set; }

    public DateTime? EnrollmentAt { get; set; }

    // Navigation properties
    [ForeignKey(nameof(UserId))]
    public User User { get; set; } = null!;

    [ForeignKey(nameof(ShelterId))]
    public Shelter? Shelter { get; set; }

    [ForeignKey(nameof(EnclosureId))]
    public Enclosure? Enclosure { get; set; }

    [JsonIgnore]
    public ICollection<Measurement> Measurements { get; init; } = new List<Measurement>();

    [JsonIgnore]
    public ICollection<DeviceUser> DeviceUsers { get; init; } = new List<DeviceUser>();
}

[Index(nameof(DeviceId), nameof(Timestamp))]
[Index(nameof(UserId), nameof(Timestamp))]
[Index(nameof(ShelterId), nameof(Timestamp))]
[Index(nameof(EnclosureId), nameof(Timestamp))]
public class Measurement
{
    [Key]
    public Guid Id { get; init; } = Guid.NewGuid();

    [Required]
    [Range(-40.0, 85.0)]
    public double Temperature { get; set; }

    [Required]
    [Range(400, 5000)]
    public double CO2 { get; set; }

    [Required]
    [Range(0, 100)]
    public double Humidity { get; set; }

    [Range(0, 100)]
    public double? Ammonia { get; set; } // ppm - CRITICAL for animal welfare (waste byproduct)

    [Range(0, 10)]
    public double? VOC { get; set; } // mg/m³ - volatile organic compounds

    [Required]
    public DateTime Timestamp { get; init; } = DateTime.UtcNow;

    [Required, MaxLength(17)]
    public string DeviceId { get; set; } = null!;

    [Required]
    public Guid UserId { get; set; }

    public Guid? DeviceUserId { get; set; }

    public Guid? ShelterId { get; set; }

    public Guid? EnclosureId { get; set; }

    // Navigation properties
    [ForeignKey(nameof(DeviceId))]
    public Device Device { get; set; } = null!;

    [ForeignKey(nameof(UserId))]
    public User User { get; set; } = null!;

    [ForeignKey(nameof(DeviceUserId))]
    public DeviceUser? DeviceUser { get; set; }
}

public class DeviceUser
{
    [Key]
    public Guid Id { get; init; } = Guid.NewGuid();

    [Required, MaxLength(17)]
    public string DeviceId { get; set; } = null!;

    [Required]
    public Guid UserId { get; set; }

    [MaxLength(200)]
    public string? ApiKeyHash { get; set; }

    public DateTime CreatedAt { get; init; } = DateTime.UtcNow;

    [ForeignKey(nameof(DeviceId))]
    public Device Device { get; set; } = null!;

    [ForeignKey(nameof(UserId))]
    public User User { get; set; } = null!;
}