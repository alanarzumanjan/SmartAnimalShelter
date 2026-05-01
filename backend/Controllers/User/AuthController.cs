using System.Security.Claims;
using Config;
using Data;
using Dtos;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Models;
using Services;
using Services.Redis;
using Validation;

namespace Controllers;

[ApiController]
[Route("/")]
[Produces("application/json")]
public class AuthController : ControllerBase
{
    private readonly AppDbContext db;
    private readonly JwtService _jwtService;
    private readonly PasswordHashingService _passwordHashingService;
    private readonly UserEmailService _userEmailService;
    private readonly IRedisService _redis;
    private readonly ShelterService _shelterService;
    private readonly ILogger<AuthController> _logger;

    private static readonly TimeSpan AuthRateWindow = TimeSpan.FromMinutes(15);
    private static readonly int AuthRateLimit =
        int.TryParse(Environment.GetEnvironmentVariable("AUTH_RATE_LIMIT"), out var v) ? v : 10;

    public AuthController(
        AppDbContext db,
        JwtService jwtService,
        PasswordHashingService passwordHashingService,
        UserEmailService userEmailService,
        IRedisService redis,
        ShelterService shelterService,
        ILogger<AuthController> logger)
    {
        this.db = db;
        _jwtService = jwtService;
        _passwordHashingService = passwordHashingService;
        _userEmailService = userEmailService;
        _redis = redis;
        _shelterService = shelterService;
        _logger = logger;
    }

    [HttpPost("register")]
    [ProducesResponseType(typeof(object), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(object), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(object), StatusCodes.Status429TooManyRequests)]
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
            var allowedRoles = new[] { nameof(UserRole.user), nameof(UserRole.shelter) };
            UserRole role = UserRole.user; // default
            if (!string.IsNullOrWhiteSpace(user.role))
            {
                var requestedRole = user.role.ToLowerInvariant();
                role = allowedRoles.Contains(requestedRole)
                    ? Enum.Parse<UserRole>(requestedRole)
                    : UserRole.user;
            }

            var newUser = new User
            {
                Id = Guid.NewGuid(),
                Username = user.name,
                Email = encryptedEmail,
                PasswordHash = _passwordHashingService.HashPassword(user.password),
                Role = role
            };

string accessToken = _jwtService.GenerateAccessToken(newUser.Id, role);
            string refreshToken = _jwtService.GenerateRefreshToken(newUser.Id, role);

            // Set refresh token as secure httpOnly cookie
            Response.Cookies.Append("refresh_token", refreshToken, new CookieOptions
            {
                HttpOnly = true,
                Secure = true,
                SameSite = SameSiteMode.Lax,
                Expires = DateTimeOffset.UtcNow.AddDays(7),
                Path = "/"
            });

            using var transaction = await db.Database.BeginTransactionAsync();
            await db.Users.AddAsync(newUser);
            await db.SaveChangesAsync();

            // Auto-create a Shelter for shelter and veterinarian role users
            if (role == UserRole.shelter)
            {
                await _shelterService.EnsureUserShelterAsync(newUser.Id, null);
                _logger.LogInformation("> Auto-created shelter for new user {UserId} with role {Role}", newUser.Id, role);
                Console.WriteLine($"> Auto-created shelter for new user {newUser.Id} with role {role}");
            }

            await transaction.CommitAsync();

return Ok(new
            {
                accessToken,
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
            _logger.LogError(ex, "> [Register] Exception");
            Console.WriteLine($"> [Register] Exception: {ex}");
            return Problem("Error: " + ex.Message);
        }
    }

    [HttpPost("login")]
    [ProducesResponseType(typeof(object), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(object), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(object), StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(typeof(object), StatusCodes.Status429TooManyRequests)]
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
                _logger.LogWarning("> ❌ User not found for email {Email}", loginRequest.email);
                var logMessage = "> ❌ User not found";
                Console.WriteLine(logMessage);
                return Unauthorized("Incorrect email or password.");
            }

bool isPasswordCorrect = _passwordHashingService.VerifyPassword(loginRequest.password, user.PasswordHash);

            if (!isPasswordCorrect)
            {
                _logger.LogWarning("> ❌ Incorrect password for user {UserId}", user.Id);
                var logMessage = "> ❌ Incorrect password";
                Console.WriteLine(logMessage);
                return Unauthorized("Incorrect email or password.");
            }

string accessToken = _jwtService.GenerateAccessToken(user.Id, user.Role);
            string refreshToken = _jwtService.GenerateRefreshToken(user.Id, user.Role);

            // Set refresh token as secure httpOnly cookie
            Response.Cookies.Append("refresh_token", refreshToken, new CookieOptions
            {
                HttpOnly = true,
                Secure = true,
                SameSite = SameSiteMode.Lax,
                Expires = DateTimeOffset.UtcNow.AddDays(7),
                Path = "/"
            });

            _logger.LogInformation("> ✅ Login success: {Username}, Role: {Role}", user.Username, user.Role);
            var logMessage2 = $"> ✅ Login success: {user.Username}, Role: {user.Role}";
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
                accessToken,
                id = user.Id,
                name = user.Username,
                email = decryptedEmail,
                phone = decryptedPhone,
                role = user.Role
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "> ❌ Login error");
            var logMessage3 = $"> ❌ Login error: {ex}";
            Console.WriteLine(logMessage3);
return Problem("Error: " + ex.Message);
        }
    }

    [HttpPost("refresh")]
    [ProducesResponseType(typeof(object), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(object), StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> RefreshToken()
    {
        // Read refresh token from httpOnly cookie
        var refreshToken = Request.Cookies["refresh_token"];
        if (string.IsNullOrWhiteSpace(refreshToken))
            return Unauthorized(new { error = "Refresh token missing." });

        try
        {
            var handler = new System.IdentityModel.Tokens.Jwt.JwtSecurityTokenHandler();
            var jwtToken = handler.ReadJwtToken(refreshToken);

            var userIdClaim = jwtToken.Claims.FirstOrDefault(c => c.Type == ClaimTypes.NameIdentifier);
            var roleClaim = jwtToken.Claims.FirstOrDefault(c => c.Type == ClaimTypes.Role);
            var tokenTypeClaim = jwtToken.Claims.FirstOrDefault(c => c.Type == "token_type");

            if (userIdClaim == null || roleClaim == null || tokenTypeClaim?.Value != "refresh")
                return Unauthorized(new { error = "Invalid refresh token." });

            if (!Guid.TryParse(userIdClaim.Value, out var userId))
                return Unauthorized(new { error = "Invalid user ID in token." });

            if (!Enum.TryParse<UserRole>(roleClaim.Value, out var role))
                return Unauthorized(new { error = "Invalid role in token." });

            // Verify user still exists
            var user = await db.Users.FindAsync(userId);
            if (user == null)
                return Unauthorized(new { error = "User not found." });

            // Generate new access token
            string newAccessToken = _jwtService.GenerateAccessToken(userId, role);

            return Ok(new { accessToken = newAccessToken });
        }
        catch
        {
            return Unauthorized(new { error = "Invalid or expired refresh token." });
        }
    }

    [HttpPost("logout")]
    [ProducesResponseType(typeof(object), StatusCodes.Status200OK)]
    public IActionResult Logout()
    {
        // Clear the refresh token cookie
Response.Cookies.Delete("refresh_token", new CookieOptions
        {
            Path = "/",
            HttpOnly = true,
            Secure = true,
            SameSite = SameSiteMode.Lax
        });

        return Ok(new { message = "Logged out successfully." });
    }
}
