using System.Security.Claims;
using Dtos;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Services;

namespace Controllers;

[ApiController]
[Route("users")]
public class UsersController : ControllerBase
{
    private readonly UserService _userService;

    public UsersController(UserService userService)
    {
        _userService = userService;
    }

    private Guid? GetCurrentUserId() =>
        Guid.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out var id) ? id : null;

    [HttpGet]
    [Authorize(Roles = "admin")]
    public async Task<IActionResult> GetAll(
        [FromQuery] string? role,
        [FromQuery] string? name,
        [FromQuery] string? email,
        [FromQuery] string? sort = "name",
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 50,
        CancellationToken ct = default)
    {
        var result = await _userService.GetAllAsync(role, name, email, sort, page, pageSize, ct);
        return Ok(new
        {
            result.CurrentPage,
            result.PageSize,
            result.TotalCount,
            result.TotalPages,
            users = result.Items
        });
    }

    [HttpGet("{id}")]
    [Authorize]
    public async Task<IActionResult> GetById(Guid id, CancellationToken ct)
    {
        var currentUserId = GetCurrentUserId();
        if (currentUserId == null)
            return Unauthorized();
        if (currentUserId != id && !User.IsInRole("admin"))
            return Forbid();

        var user = await _userService.GetByIdAsync(id, ct);
        return user == null ? NotFound(new { error = "User not found." }) : Ok(user);
    }

    [HttpGet("me")]
    [Authorize]
    public async Task<IActionResult> GetCurrentUser(CancellationToken ct)
    {
        var userId = GetCurrentUserId();
        if (userId == null)
            return Unauthorized();

        var user = await _userService.GetByIdAsync(userId.Value, ct);
        return user == null ? NotFound() : Ok(user);
    }

    [HttpPatch("{id}")]
    [Authorize]
    public async Task<IActionResult> Patch(Guid id, [FromBody] UserUpdateDto dto, CancellationToken ct)
    {
        var currentUserId = GetCurrentUserId();
        if (currentUserId == null)
            return Unauthorized();
        if (currentUserId != id && !User.IsInRole("admin"))
            return Forbid();

        var result = await _userService.UpdateAsync(id, dto, ct);
        return result switch
        {
            UserService.UpdateResult.NotFound => NotFound(new { error = "User not found." }),
            UserService.UpdateResult.EmailTaken => BadRequest(new { error = "Email is already taken." }),
            _ => Ok(new { message = "User updated." })
        };
    }

    [HttpPatch("{id}/password")]
    [Authorize]
    public async Task<IActionResult> UpdatePassword(Guid id, [FromBody] PasswordUpdateDto dto, CancellationToken ct)
    {
        var currentUserId = GetCurrentUserId();
        if (currentUserId == null)
            return Unauthorized();
        if (currentUserId != id && !User.IsInRole("admin"))
            return Forbid();

        var result = await _userService.UpdatePasswordAsync(id, dto, ct);
        return result switch
        {
            UserService.PasswordUpdateResult.NotFound => NotFound(),
            UserService.PasswordUpdateResult.MissingCurrent => BadRequest(new { error = "Current password is required." }),
            UserService.PasswordUpdateResult.MissingNew => BadRequest(new { error = "New password is required." }),
            UserService.PasswordUpdateResult.WrongCurrent => BadRequest(new { error = "Current password is incorrect." }),
            _ => Ok(new { message = "Password updated" })
        };
    }

    [HttpDelete("{id}")]
    [Authorize]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
    {
        var currentUserId = GetCurrentUserId();
        if (currentUserId == null)
            return Unauthorized();
        if (currentUserId != id && !User.IsInRole("admin"))
            return Forbid();

        var deleted = await _userService.DeleteAsync(id, ct);
        return deleted ? Ok(new { message = "User deleted." }) : NotFound(new { error = "User not found." });
    }

    [HttpDelete("all")]
    [Authorize(Roles = "admin")]
    public async Task<IActionResult> DeleteAll(CancellationToken ct)
    {
        var count = await _userService.DeleteAllAsync(ct);
        return Ok(new { message = "All users deleted.", deletedCount = count });
    }
}
