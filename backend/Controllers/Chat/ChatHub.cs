using System.Security.Claims;
using Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using Models;

namespace Hubs;

[Authorize]
public class ChatHub : Hub
{
    private readonly AppDbContext _db;
    private readonly ILogger<ChatHub> _logger;

    public ChatHub(AppDbContext db, ILogger<ChatHub> logger)
    {
        _db = db;
        _logger = logger;
    }

    private Guid? GetUserId() =>
        Guid.TryParse(Context.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value, out var id) ? id : null;

    private bool IsAdmin() =>
        Context.User?.IsInRole("admin") ?? false;

    public async Task JoinRoom(string roomId)
    {
        var userId = GetUserId();
        if (userId == null)
        {
            _logger.LogWarning("> JoinRoom rejected: no userId in context");
            throw new HubException("Authentication required.");
        }

        // Verify room membership: user must already be a member OR be an admin
        var isMember = await _db.ChatRoomMembers
            .AnyAsync(m => m.RoomId == roomId && m.UserId == userId);

        if (!isMember && !IsAdmin())
        {
            _logger.LogWarning("> JoinRoom rejected: user {UserId} is not a member of room {RoomId}", userId, roomId);
            throw new HubException("You are not a member of this chat room.");
        }

        await Groups.AddToGroupAsync(Context.ConnectionId, roomId);
        _logger.LogInformation("> User {UserId} joined room {RoomId}", userId, roomId);

        // Register as member if not already (admins joining for support)
        if (!isMember)
        {
            _db.ChatRoomMembers.Add(new ChatRoomMember
            {
                RoomId = roomId,
                UserId = userId.Value,
            });
            await _db.SaveChangesAsync();
        }
    }

    public async Task LeaveRoom(string roomId)
    {
        await Groups.RemoveFromGroupAsync(Context.ConnectionId, roomId);
    }

    public async Task SendMessage(string roomId, string text)
    {
        var userId = GetUserId();
        if (userId == null || string.IsNullOrWhiteSpace(text))
            return;

        // Verify membership before allowing message send
        var isMember = await _db.ChatRoomMembers
            .AnyAsync(m => m.RoomId == roomId && m.UserId == userId);
        if (!isMember && !IsAdmin())
        {
            _logger.LogWarning("> SendMessage rejected: user {UserId} not in room {RoomId}", userId, roomId);
            throw new HubException("You are not a member of this chat room.");
        }

        var user = await _db.Users.FindAsync(userId);
        if (user == null)
            return;

        var message = new ChatMessage
        {
            RoomId = roomId,
            SenderId = user.Id,
            SenderName = user.Username,
            Text = text.Trim(),
            CreatedAt = DateTime.UtcNow,
        };

        _db.ChatMessages.Add(message);
        await _db.SaveChangesAsync();
        _logger.LogInformation("> Message sent in room {RoomId} by user {UserId}", roomId, userId);

        var payload = new
        {
            id = message.Id,
            roomId = message.RoomId,
            senderId = message.SenderId,
            senderName = message.SenderName,
            text = message.Text,
            createdAt = message.CreatedAt,
        };

        // Send to everyone currently in the SignalR group (joined the room this session)
        await Clients.Group(roomId).SendAsync("ReceiveMessage", payload);
    }
}
