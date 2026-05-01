namespace Services.Redis;

public interface IRedisService
{
    Task SetAsync<T>(string key, T value, TimeSpan ttl);
    Task<T?> GetAsync<T>(string key);
    Task DeleteAsync(string key);
    Task<bool> AllowRequestAsync(string key, int limit, TimeSpan window);
    Task RevokeRefreshTokenAsync(string jti, TimeSpan ttl);
    Task<bool> IsRefreshTokenRevokedAsync(string jti);
}
