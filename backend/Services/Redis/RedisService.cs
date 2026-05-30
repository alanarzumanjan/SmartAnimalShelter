using System.Text.Json;
using StackExchange.Redis;

namespace Services.Redis;

public class RedisService : IRedisService
{
    private readonly IDatabase _db;

    public RedisService(IConnectionMultiplexer redis)
    {
        _db = redis.GetDatabase();
    }

    public async Task SetAsync<T>(string key, T value, TimeSpan ttl)
    {
        var json = JsonSerializer.Serialize(value);
        await _db.StringSetAsync(key, json, ttl);
    }

    public async Task<T?> GetAsync<T>(string key)
    {
        var value = await _db.StringGetAsync(key);
        if (value.IsNullOrEmpty)
            return default;
        return JsonSerializer.Deserialize<T>(value!);
    }

    public async Task DeleteAsync(string key) =>
        await _db.KeyDeleteAsync(key);

    public async Task RevokeRefreshTokenAsync(string jti, TimeSpan ttl) =>
        await _db.StringSetAsync($"revoked_rt:{jti}", "1", ttl);

    public async Task<bool> IsRefreshTokenRevokedAsync(string jti) =>
        await _db.KeyExistsAsync($"revoked_rt:{jti}");

    // Sliding window rate limiter — returns true if the request is allowed.
    public async Task<bool> AllowRequestAsync(string key, int limit, TimeSpan window)
    {
        var now = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
        var windowStart = now - (long)window.TotalMilliseconds;

        var tx = _db.CreateTransaction();

        _ = tx.SortedSetRemoveRangeByScoreAsync(key, 0, windowStart);
        var countTask = tx.SortedSetLengthAsync(key);
        _ = tx.SortedSetAddAsync(key, now.ToString(), now);
        _ = tx.KeyExpireAsync(key, window);

        await tx.ExecuteAsync();

        // countTask reflects the count before the current request was added
        var count = await countTask;
        return count < limit;
    }
}
