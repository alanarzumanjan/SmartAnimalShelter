using System.Collections.Concurrent;
using System.Text.Json;
using Services.Redis;

namespace tests.Infrastructure;

internal sealed class FakeRedisService : IRedisService
{
    private readonly ConcurrentDictionary<string, Entry> _entries = new();
    private readonly ConcurrentDictionary<string, ConcurrentQueue<DateTimeOffset>> _rateLimits = new();

    public Task SetAsync<T>(string key, T value, TimeSpan ttl)
    {
        var entry = new Entry(JsonSerializer.Serialize(value), DateTimeOffset.UtcNow.Add(ttl));
        _entries[key] = entry;
        return Task.CompletedTask;
    }

    public Task<T?> GetAsync<T>(string key)
    {
        if (!_entries.TryGetValue(key, out var entry))
            return Task.FromResult(default(T));

        if (entry.ExpiresAt <= DateTimeOffset.UtcNow)
        {
            _entries.TryRemove(key, out _);
            return Task.FromResult(default(T));
        }

        return Task.FromResult(JsonSerializer.Deserialize<T>(entry.Value));
    }

    public Task DeleteAsync(string key)
    {
        _entries.TryRemove(key, out _);
        return Task.CompletedTask;
    }

    public Task<bool> AllowRequestAsync(string key, int limit, TimeSpan window)
    {
        var now = DateTimeOffset.UtcNow;
        var queue = _rateLimits.GetOrAdd(key, _ => new ConcurrentQueue<DateTimeOffset>());

        while (queue.TryPeek(out var timestamp) && now - timestamp > window)
        {
            queue.TryDequeue(out _);
        }

        var allowed = queue.Count < limit;
        if (allowed)
            queue.Enqueue(now);

        return Task.FromResult(allowed);
    }

    private sealed record Entry(string Value, DateTimeOffset ExpiresAt);
}
