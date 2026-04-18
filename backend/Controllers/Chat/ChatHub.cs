using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using Models;
using Data;

namespace Hubs;

[Authorize]
public class ChatHub : Hub
{
    private readonly AppDbContext _db;

    public ChatHub(AppDbContext db)
    {
        _db = db;
    }

    private Guid? GetUserId() =>
        Guid.TryParse(Context.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value, out var id) ? id : null;

    public async Task JoinRoom(string roomId)
    {
        await Groups.AddToGroupAsync(Context.ConnectionId, roomId);

        var userId = GetUserId();
        if (userId == null) return;

        // Register as member if not already
        var exists = await _db.ChatRoomMembers
            .AnyAsync(m => m.RoomId == roomId && m.UserId == userId);

        if (!exists)
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
        if (userId == null || string.IsNullOrWhiteSpace(text)) return;

        var user = await _db.Users.FindAsync(userId);
        if (user == null) return;

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
