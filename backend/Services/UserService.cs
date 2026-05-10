using Data;
using Dtos;
using Microsoft.EntityFrameworkCore;
using Models;

namespace Services;

public sealed class UserService
{
    private readonly AppDbContext _db;
    private readonly UserEmailService _emailService;
    private readonly PasswordHashingService _passwordHashingService;

    public UserService(AppDbContext db, UserEmailService emailService, PasswordHashingService passwordHashingService)
    {
        _db = db;
        _emailService = emailService;
        _passwordHashingService = passwordHashingService;
    }

    public async Task<UserProfileDto?> GetByIdAsync(Guid id, CancellationToken ct = default)
    {
        var user = await _db.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == id, ct);
        return user == null ? null : ToProfileDto(user);
    }

    public async Task<PagedResult<UserProfileDto>> GetAllAsync(
        string? role, string? name, string? email,
        string? sort, int page, int pageSize, CancellationToken ct = default)
    {
        page = Math.Max(1, page);
        pageSize = Math.Clamp(pageSize, 1, 200);

        var query = _db.Users.AsNoTracking().AsQueryable();

        if (!string.IsNullOrWhiteSpace(role) && Enum.TryParse<UserRole>(role, out var roleEnum))
            query = query.Where(u => u.Role == roleEnum);

        if (!string.IsNullOrWhiteSpace(name))
            query = query.Where(u => u.Username != null && u.Username.ToLower().Contains(name.ToLower()));

        var totalCount = await query.CountAsync(ct);

        var users = await query
            .OrderBy(u => u.Username)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(ct);

        // Email filter must be client-side because values are AES-encrypted
        IEnumerable<User> filtered = users;
        if (!string.IsNullOrWhiteSpace(email))
            filtered = users.Where(u => EncryptionService.EmailMatchesEncryptedValue(u.Email, email));

        var dtos = filtered.Select(ToProfileDto).ToList();

        // Apply sort after decryption (email sort requires plaintext)
        dtos = sort switch
        {
            "created" => dtos.OrderByDescending(u => u.CreatedAt).ToList(),
            "email" => dtos.OrderBy(u => u.Email ?? string.Empty).ToList(),
            _ => dtos.OrderBy(u => u.Username).ToList()
        };

        return new PagedResult<UserProfileDto>
        {
            CurrentPage = page,
            PageSize = pageSize,
            TotalCount = totalCount,
            TotalPages = (int)Math.Ceiling(totalCount / (double)pageSize),
            Items = dtos
        };
    }

    public async Task<UpdateResult> UpdateAsync(Guid id, UserUpdateDto dto, CancellationToken ct = default)
    {
        var user = await _db.Users.FirstOrDefaultAsync(u => u.Id == id, ct);
        if (user == null)
            return UpdateResult.NotFound;

        if (!string.IsNullOrWhiteSpace(dto.email))
        {
            var trimmed = dto.email.Trim();
            if (await _emailService.EmailExistsAsync(trimmed, id, ct))
                return UpdateResult.EmailTaken;
            user.Email = EncryptionService.Encrypt(trimmed) ?? user.Email;
        }

        if (!string.IsNullOrWhiteSpace(dto.name))
            user.Username = dto.name;
        if (!string.IsNullOrWhiteSpace(dto.phone))
            user.Phone = EncryptionService.Encrypt(dto.phone) ?? user.Phone;
        if (dto.address != null)
            user.Address = dto.address;
        if (!string.IsNullOrWhiteSpace(dto.role) && Enum.TryParse<UserRole>(dto.role, out var roleEnum))
            user.Role = roleEnum;

        await _db.SaveChangesAsync(ct);
        return UpdateResult.Success;
    }

    public async Task<PasswordUpdateResult> UpdatePasswordAsync(Guid id, PasswordUpdateDto dto, CancellationToken ct = default)
    {
        var user = await _db.Users.FindAsync([id], ct);
        if (user == null)
            return PasswordUpdateResult.NotFound;

        if (string.IsNullOrWhiteSpace(dto.CurrentPassword))
            return PasswordUpdateResult.MissingCurrent;
        if (string.IsNullOrWhiteSpace(dto.NewPassword))
            return PasswordUpdateResult.MissingNew;
        if (!_passwordHashingService.VerifyPassword(dto.CurrentPassword, user.PasswordHash))
            return PasswordUpdateResult.WrongCurrent;

        user.PasswordHash = _passwordHashingService.HashPassword(dto.NewPassword);
        await _db.SaveChangesAsync(ct);
        return PasswordUpdateResult.Success;
    }

    public async Task<bool> DeleteAsync(Guid id, CancellationToken ct = default)
    {
        var user = await _db.Users.FindAsync([id], ct);
        if (user == null)
            return false;
        _db.Users.Remove(user);
        await _db.SaveChangesAsync(ct);
        return true;
    }

    public async Task<int> DeleteAllAsync(CancellationToken ct = default)
    {
        var users = await _db.Users.ToListAsync(ct);
        if (users.Count == 0)
            return 0;
        _db.Users.RemoveRange(users);
        await _db.SaveChangesAsync(ct);
        return users.Count;
    }

    private static UserProfileDto ToProfileDto(User user) => new()
    {
        Id = user.Id,
        Username = user.Username,
        Email = TryDecrypt(user.Email),
        Phone = TryDecrypt(user.Phone),
        Address = user.Address,
        Role = user.Role,
        CreatedAt = user.CreatedAt
    };

    private static string? TryDecrypt(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
            return null;
        try
        { return EncryptionService.Decrypt(value); }
        catch { return value; }
    }

    public enum UpdateResult { Success, NotFound, EmailTaken }
    public enum PasswordUpdateResult { Success, NotFound, MissingCurrent, MissingNew, WrongCurrent }
}

public sealed class PagedResult<T>
{
    public int CurrentPage { get; init; }
    public int PageSize { get; init; }
    public int TotalCount { get; init; }
    public int TotalPages { get; init; }
    public IReadOnlyList<T> Items { get; init; } = [];
}

public sealed class UserProfileDto
{
    public Guid Id { get; init; }
    public string? Username { get; init; }
    public string? Email { get; init; }
    public string? Phone { get; init; }
    public string? Address { get; init; }
    public UserRole Role { get; init; }
    public DateTime CreatedAt { get; init; }
}
