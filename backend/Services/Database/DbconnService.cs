using DotNetEnv;

public class DbConnectionService
{
    private static string? _cached;

    public static string TestDatabaseConnection()
    {
        if (!string.IsNullOrWhiteSpace(_cached))
            return _cached!;

        var envPath = Path.Combine(Directory.GetCurrentDirectory(), ".env");
        if (File.Exists(envPath))
        {
            try { Env.Load(envPath); }
            catch { Console.WriteLine("⚠️ Failed to load .env"); }
        }

        var host = Environment.GetEnvironmentVariable("HOST") ?? "localhost";
        var port = Environment.GetEnvironmentVariable("DPORT") ?? "5432";
        var database = Environment.GetEnvironmentVariable("DATABASE") ?? "postgres";
        var user = Environment.GetEnvironmentVariable("POSTGRES_USER") ?? "postgres";
        var password = Environment.GetEnvironmentVariable("PASSWORD") ?? "postgres";

        var direct = Environment.GetEnvironmentVariable("POSTGRES_CONNECTION_STRING");
        if (!string.IsNullOrWhiteSpace(direct))
        {
            _cached = direct;
            Console.WriteLine("✅ Using POSTGRES_CONNECTION_STRING");
            return _cached!;
        }

        _cached = $"Host={host};Port={port};Database={database};Username={user};Password={password};";
        Console.WriteLine($"✅ Using PostgreSQL connection: {host}:{port}");
        return _cached!;
    }
}
