using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Mvc;
using Validation;
using Services;
using Services.Redis;
using Config;
using Models;
using Dtos;
using Data;

namespace Controllers;

[ApiController]
[Route("/")]
public class AuthController : ControllerBase
{
    private readonly AppDbContext db;
    private readonly JwtService _jwtService;
    private readonly PasswordHashingService _passwordHashingService;
    private readonly UserEmailService _userEmailService;
    private readonly RedisService _redis;

    private static readonly TimeSpan AuthRateWindow = TimeSpan.FromMinutes(15);
    private static readonly int AuthRateLimit =
        int.TryParse(Environment.GetEnvironmentVariable("AUTH_RATE_LIMIT"), out var v) ? v : 10;

    public AuthController(
        AppDbContext db,
        JwtService jwtService,
        PasswordHashingService passwordHashingService,
        UserEmailService userEmailService,
        RedisService redis)
    {
        this.db = db;
        _jwtService = jwtService;
        _passwordHashingService = passwordHashingService;
        _userEmailService = userEmailService;
        _redis = redis;
    }

    [HttpPost("register")]
    public async Task<IActionResult> Register([FromBody] UserRegisterDto user)
    {
        var ip = HttpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown";
        if (!await _redis.AllowRequestAsync($"ratelimit:auth:{ip}", AuthRateLimit, AuthRateWindow))
            return StatusCode(429, new { error = "Too many attempts. Try again later." });

        var validator = new UserRegisterValidator();
        var errors = validator.Validate(user);

        if (errors.Any())
            return BadRequest(new { errors });

        if (string.IsNullOrWhiteSpace(user.email))
            return BadRequest("Email is required.");

        if (string.IsNullOrWhiteSpace(user.name))
            return BadRequest("Username is required.");

        if (string.IsNullOrWhiteSpace(user.password))
            return BadRequest("Password is required.");

        try
        {
            var trimmedEmail = user.email.Trim();
            string? encryptedEmail = EncryptionService.Encrypt(trimmedEmail);
            if (encryptedEmail == null)
                return BadRequest("Email encryption failed. Email is empty or invalid.");

            if (await db.Users.AnyAsync(u => u.Username == user.name))
                return BadRequest("Username already exists.");

            if (await _userEmailService.EmailExistsAsync(trimmedEmail))
                return BadRequest("Email already exists.");

            // Validate and default role
            var allowedRoles = new[] { "user", "veterinarian", "shelter" };
            string role = "user"; // default
            if (!string.IsNullOrWhiteSpace(user.role))
            {
                var requestedRole = user.role.ToLowerInvariant();
                role = allowedRoles.Contains(requestedRole) ? requestedRole : "user";
            }

            var newUser = new User
            {
                Id = Guid.NewGuid(),
                Username = user.name,
                Email = encryptedEmail,
                PasswordHash = _passwordHashingService.HashPassword(user.password),
                Role = role
            };

            string token = _jwtService.GenerateToken(newUser.Id, role);

            using var transaction = await db.Database.BeginTransactionAsync();
            await db.Users.AddAsync(newUser);
            await db.SaveChangesAsync();

            // Auto-create a Shelter for shelter and veterinarian role users
            if (role == "shelter" || role == "veterinarian")
            {
                var defaultShelter = new Shelter
                {
                    Id = Guid.NewGuid(),
                    Name = role == "shelter" ? $"{newUser.Username}'s Shelter" : $"{newUser.Username}'s Vet Clinic",
                    Address = "Address to be updated",
                    Phone = null,
                    Email = encryptedEmail,
                    Description = null,
                    OwnerId = newUser.Id,
                    CreatedAt = DateTime.UtcNow
                };
                await db.Shelters.AddAsync(defaultShelter);
                await db.SaveChangesAsync();
            }

            await transaction.CommitAsync();

            return Ok(new
            {
                token,
                user = new
                {
                    id = newUser.Id,
                    name = newUser.Username,
                    email = trimmedEmail,
                    role = newUser.Role
                },
                message = "User registered successfully"
            });
        }
        catch (Exception ex)
        {
            Console.WriteLine($"> [Register] Exception: {ex}");
            return Problem("Error: " + ex.Message);
        }
    }

    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] UserLoginDto loginRequest)
    {
        var ip = HttpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown";
        if (!await _redis.AllowRequestAsync($"ratelimit:auth:{ip}", AuthRateLimit, AuthRateWindow))
            return StatusCode(429, new { error = "Too many attempts. Try again later." });

        var validator = new UserLoginValidator();
        var errors = validator.Validate(loginRequest);

        if (errors.Any())
            return BadRequest(new { errors });

        if (string.IsNullOrWhiteSpace(loginRequest.email))
            return BadRequest("Email is required.");

        if (string.IsNullOrWhiteSpace(loginRequest.password))
            return BadRequest("Password is required.");

        try
        {
            var user = await _userEmailService.FindByEmailAsync(loginRequest.email);

            if (user == null)
            {
                var logMessage = "> ❌ User not found";
                Console.WriteLine(logMessage);
                return Unauthorized("Incorrect email or password.");
            }

            bool isPasswordCorrect = _passwordHashingService.VerifyPassword(loginRequest.password, user.PasswordHash);

            if (!isPasswordCorrect)
            {
                var logMessage = "> ❌ Incorrect password";
                Console.WriteLine(logMessage);
                return Unauthorized("Incorrect email or password.");
            }

            string role = user.Role ?? "user"; 
            string token = _jwtService.GenerateToken(user.Id, role);

            var logMessage2 = $"> ✅ Login success: {user.Username}, Role: {role}";
            Console.WriteLine(logMessage2);

            string? decryptedEmail = null;
            string? decryptedPhone = null;

            try 
            { 
                decryptedEmail = EncryptionService.Decrypt(user.Email); 
            } 
            catch { }

            try 
            { 
                if (!string.IsNullOrWhiteSpace(user.Phone))
                    decryptedPhone = EncryptionService.Decrypt(user.Phone); 
            } 
            catch { }

            return Ok(new
            {
                token,
                id = user.Id,
                name = user.Username,
                email = decryptedEmail,
                phone = decryptedPhone,
                role = user.Role
            });
        }
        catch (Exception ex)
        {
            var logMessage3 = $"> ❌ Login error: {ex}";
            Console.WriteLine(logMessage3);
            return Problem("Error: " + ex.Message);
        }
    }
}
