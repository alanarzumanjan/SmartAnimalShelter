using System.Security.Claims;
using Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Controllers;

[ApiController]
[Route("chat")]
[Authorize]
public class ChatController : ControllerBase
{
    private readonly AppDbContext _db;

    public ChatController(AppDbContext db)
    {
        _db = db;
    }

    private Guid? GetUserId()
    {
        var raw = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        return Guid.TryParse(raw, out var id) ? id : null;
    }

    [HttpGet("rooms")]
    public async Task<IActionResult> GetRooms()
    {
        var userId = GetUserId();
        if (userId == null)
            return Unauthorized();

        var roomIds = await _db.ChatRoomMembers
            .Where(m => m.UserId == userId)
            .Select(m => m.RoomId)
            .ToListAsync();

        if (roomIds.Count == 0)
            return Ok(new List<object>());

        var allMembers = await _db.ChatRoomMembers
            .Where(m => roomIds.Contains(m.RoomId) && m.UserId != userId)
            .ToListAsync();

        var recipientIds = allMembers.Select(m => m.UserId).Distinct().ToList();
        var recipients = await _db.Users
            .Where(u => recipientIds.Contains(u.Id))
            .Select(u => new { u.Id, u.Username })
            .ToDictionaryAsync(u => u.Id);

        var recipientByRoom = allMembers
            .GroupBy(m => m.RoomId)
            .ToDictionary(
                g => g.Key,
                g => recipients.TryGetValue(g.First().UserId, out var u) ? u.Username : null
            );

        // Load last message per room in memory
        var messages = await _db.ChatMessages
            .Where(m => roomIds.Contains(m.RoomId))
            .OrderByDescending(m => m.CreatedAt)
            .ToListAsync();

        var rooms = messages
            .GroupBy(m => m.RoomId)
            .Select(g =>
            {
                var last = g.First();
                recipientByRoom.TryGetValue(g.Key, out var recipientName);
                return new
                {
                    roomId = g.Key,
                    recipientName,
                    lastMessage = new { last.SenderName, last.Text, last.CreatedAt },
                };
            })
            .OrderByDescending(r => r.lastMessage.CreatedAt)
            .ToList<object>();

        // Include rooms with no messages yet
        foreach (var roomId in roomIds.Where(id => rooms.All(r => ((dynamic)r).roomId != id)))
        {
            recipientByRoom.TryGetValue(roomId, out var recipientName);
            rooms.Add(new
            {
                roomId,
                recipientName,
                lastMessage = new { SenderName = "", Text = "No messages yet", CreatedAt = DateTime.UtcNow },
            });
        }

        return Ok(rooms);
    }

    [HttpGet("rooms/{roomId}/messages")]
    public async Task<IActionResult> GetMessages(string roomId, [FromQuery] int limit = 50)
    {
        var messages = await _db.ChatMessages
            .Where(m => m.RoomId == roomId)
            .OrderByDescending(m => m.CreatedAt)
            .Take(limit)
            .OrderBy(m => m.CreatedAt)
            .Select(m => new
            {
                m.Id,
                m.RoomId,
                m.SenderId,
                m.SenderName,
                m.Text,
                m.CreatedAt,
            })
            .ToListAsync();

        return Ok(messages);
    }

    [HttpPost("rooms/{roomId}/join")]
    public async Task<IActionResult> JoinRoom(string roomId, [FromBody] JoinRoomDto? dto)
    {
        var userId = GetUserId();
        if (userId == null)
            return Unauthorized();

        // Add current user as member
        await EnsureMember(roomId, userId.Value);

        // Also add recipient if provided (so they see the room in their list)
        if (dto?.RecipientId != null)
            await EnsureMember(roomId, dto.RecipientId.Value);

        return Ok();
    }

    private async Task EnsureMember(string roomId, Guid userId)
    {
        var exists = await _db.ChatRoomMembers
            .AnyAsync(m => m.RoomId == roomId && m.UserId == userId);

        if (!exists)
        {
            _db.ChatRoomMembers.Add(new Models.ChatRoomMember
            {
                RoomId = roomId,
                UserId = userId,
            });
            await _db.SaveChangesAsync();
        }
    }
}

public class JoinRoomDto
{
    public Guid? RecipientId { get; set; }
}
