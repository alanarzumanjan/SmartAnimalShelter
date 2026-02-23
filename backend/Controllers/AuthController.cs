using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using Validation;
using Services;
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

    public AuthController(
        AppDbContext db, 
        JwtService jwtService, 
        PasswordHashingService passwordHashingService)
    {
        this.db = db;
        _jwtService = jwtService;
        _passwordHashingService = passwordHashingService;
    }

    [HttpPost("register")]
    public async Task<IActionResult> Register([FromBody] UserRegisterDto user)
    {
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
            string? encryptedEmail = EncryptionService.Encrypt(user.email);

            if (await db.Users.AnyAsync(u => u.Username == user.name))
                return BadRequest("Username already exists.");

            if (await db.Users.AnyAsync(u => u.Email == encryptedEmail))
                return BadRequest("Email already exists.");

            string role = user.role ?? "user";

            var newUser = new User
            {
                Id = Guid.NewGuid(),
                Username = user.name,
                Email = encryptedEmail,
                PasswordHash = _passwordHashingService.HashPassword(user.password),
                Role = role
            };

            using var transaction = await db.Database.BeginTransactionAsync();
            await db.Users.AddAsync(newUser);
            await db.SaveChangesAsync();
            await transaction.CommitAsync();

            return Ok("User registered successfully.");
        }
        catch (Exception ex)
        {
            return Problem("Error: " + ex.Message);
        }
    }

    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] UserLoginDto loginRequest)
    {
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
            var encryptedEmail = EncryptionService.Encrypt(loginRequest.email);
            var user = await db.Users.FirstOrDefaultAsync(u => u.Email == encryptedEmail);

            if (user == null)
            {
                Console.WriteLine("❌ User not found.");
                return Unauthorized("Incorrect email or password.");
            }

            bool isPasswordCorrect = _passwordHashingService.VerifyPassword(loginRequest.password, user.PasswordHash);

            if (!isPasswordCorrect)
            {
                Console.WriteLine("❌ Incorrect password.");
                return Unauthorized("Incorrect email or password.");
            }

            string role = user.Role ?? "user"; 
            string token = _jwtService.GenerateToken(user.Id, role);

            Console.WriteLine($"✅ Login success: {user.Username}, Role: {role}");

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
            Console.WriteLine("❌ Login error: " + ex);
            return Problem("Error: " + ex.Message);
        }
    }
}