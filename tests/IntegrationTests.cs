using Data;
using Microsoft.EntityFrameworkCore;
using Testcontainers.PostgreSql;

namespace tests;

public class IntegrationTests : IAsyncLifetime
{
    private PostgreSqlContainer? _postgresContainer;

    public async Task InitializeAsync()
    {
        _postgresContainer = new PostgreSqlBuilder()
            .WithDatabase("shelter_test")
            .WithUsername("test")
            .WithPassword("test")
            .Build();

        await _postgresContainer.StartAsync();
    }

    public async Task DisposeAsync()
    {
        if (_postgresContainer is not null)
        {
            await _postgresContainer.DisposeAsync();
        }
    }

    [Fact]
    public async Task AppDbContext_CanConnect_ToPostgresContainer()
    {
        var connectionString = _postgresContainer!.GetConnectionString();
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseNpgsql(connectionString)
            .Options;

        await using var context = new AppDbContext(options);
        var canConnect = await context.Database.CanConnectAsync();

        Assert.True(canConnect);
    }

    [Fact]
    public async Task AppDbContext_MigrationsApplySuccessfully()
    {
        var connectionString = _postgresContainer!.GetConnectionString();
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseNpgsql(connectionString)
            .Options;

        await using var context = new AppDbContext(options);
        await context.Database.MigrateAsync();

        var pending = await context.Database.GetPendingMigrationsAsync();
        Assert.Empty(pending);
    }

    [Fact]
    public async Task AppDbContext_CanInsertAndQueryUser()
    {
        var connectionString = _postgresContainer!.GetConnectionString();
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseNpgsql(connectionString)
            .Options;

        await using var context = new AppDbContext(options);
        await context.Database.MigrateAsync();

        var user = new Models.User
        {
            Username = "testuser",
            Email = "test@example.com",
            PasswordHash = "fakehash"
        };

        context.Users.Add(user);
        await context.SaveChangesAsync();

        var found = await context.Users.FirstOrDefaultAsync(u => u.Email == "test@example.com");
        Assert.NotNull(found);
        Assert.Equal("testuser", found.Username);
    }
}

