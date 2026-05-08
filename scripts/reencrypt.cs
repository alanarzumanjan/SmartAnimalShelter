using System.Security.Cryptography;
using System.Text;
using Npgsql;

// Usage:
//   cd scripts
//   dotnet run -- <OLD_BASE64_KEY> <NEW_BASE64_KEY> "<POSTGRES_CONNECTION_STRING>"
//
// Example connection string:
//   "Host=localhost;Port=5433;Database=shelter_db;Username=shelter_user;Password=yourpassword"

if (args.Length < 3)
{
    Console.Error.WriteLine("Usage: dotnet run -- <OLD_KEY> <NEW_KEY> <CONNECTION_STRING>");
    Environment.Exit(1);
}

var oldKey = ParseKey(args[0], "OLD_KEY");
var newKey = ParseKey(args[1], "NEW_KEY");
var connStr = args[2];

Console.WriteLine("🔑 Keys loaded. Connecting to database...");

await using var conn = new NpgsqlConnection(connStr);
await conn.OpenAsync();

var users = new List<(Guid id, string? email, string? phone)>();
await using (var cmd = new NpgsqlCommand(@"SELECT ""Id"", ""Email"", ""Phone"" FROM ""Users""", conn))
await using (var reader = await cmd.ExecuteReaderAsync())
{
    while (await reader.ReadAsync())
        users.Add((reader.GetGuid(0),
                   reader.IsDBNull(1) ? null : reader.GetString(1),
                   reader.IsDBNull(2) ? null : reader.GetString(2)));
}

Console.WriteLine($"📋 Found {users.Count} users to re-encrypt.");

int updated = 0, failed = 0;
await using var tx = await conn.BeginTransactionAsync();

foreach (var (id, email, phone) in users)
{
    string? newEmail = null;
    string? newPhone = null;

    try
    {
        newEmail = email != null ? Encrypt(Decrypt(email, oldKey), newKey) : null;
    }
    catch (Exception ex)
    {
        Console.Error.WriteLine($"❌ User {id} email failed: {ex.Message}");
        failed++;
        continue;
    }

    try
    {
        newPhone = phone != null ? Encrypt(Decrypt(phone, oldKey), newKey) : null;
    }
    catch (Exception ex)
    {
        Console.Error.WriteLine($"⚠️  User {id} phone failed (skipping phone only): {ex.Message}");
    }

    await using var upd = new NpgsqlCommand(
        @"UPDATE ""Users"" SET ""Email"" = @e, ""Phone"" = @p WHERE ""Id"" = @id", conn, tx);
    upd.Parameters.AddWithValue("e", (object?)newEmail ?? DBNull.Value);
    upd.Parameters.AddWithValue("p", (object?)newPhone ?? DBNull.Value);
    upd.Parameters.AddWithValue("id", id);
    await upd.ExecuteNonQueryAsync();
    updated++;
}

if (failed > 0)
{
    await tx.RollbackAsync();
    Console.Error.WriteLine($"❌ Rolling back — {failed} users failed to decrypt. Check your OLD_KEY.");
    Environment.Exit(1);
}

await tx.CommitAsync();
Console.WriteLine($"✅ Re-encrypted {updated} users successfully.");
Console.WriteLine("👉 Now update ENCRYPTION_KEY in backend/.env and restart the backend.");

// ── helpers ──────────────────────────────────────────────────────────────────

static byte[] ParseKey(string b64, string name)
{
    byte[] key;
    try { key = Convert.FromBase64String(b64); }
    catch { throw new Exception($"{name} is not valid base64."); }
    if (key.Length != 32) throw new Exception($"{name} must decode to 32 bytes, got {key.Length}.");
    return key;
}

static string Decrypt(string cipherText, byte[] key)
{
    var full = Convert.FromBase64String(cipherText);
    const int nonceSize = 12, tagSize = 16;
    var nonce  = full[..nonceSize];
    var tag    = full[nonceSize..(nonceSize + tagSize)];
    var cipher = full[(nonceSize + tagSize)..];
    var plain  = new byte[cipher.Length];
    using var aes = new AesGcm(key, 16);
    aes.Decrypt(nonce, cipher, tag, plain);
    return Encoding.UTF8.GetString(plain);
}

static string Encrypt(string plainText, byte[] key)
{
    var plain  = Encoding.UTF8.GetBytes(plainText);
    var nonce  = new byte[12];
    var tag    = new byte[16];
    var cipher = new byte[plain.Length];
    RandomNumberGenerator.Fill(nonce);
    using var aes = new AesGcm(key, 16);
    aes.Encrypt(nonce, plain, cipher, tag);
    var output = new byte[nonce.Length + tag.Length + cipher.Length];
    Buffer.BlockCopy(nonce,  0, output, 0,                         nonce.Length);
    Buffer.BlockCopy(tag,    0, output, nonce.Length,              tag.Length);
    Buffer.BlockCopy(cipher, 0, output, nonce.Length + tag.Length, cipher.Length);
    return Convert.ToBase64String(output);
}
