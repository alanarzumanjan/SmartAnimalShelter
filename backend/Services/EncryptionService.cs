using System.Security.Cryptography;
using System.Text;

namespace Services;

public static class EncryptionService
{
    private static byte[]? _key;

    /// <summary>
    /// Initializes the encryption service with a base64-encoded 32-byte key.
    /// Must be called once before any Encrypt/Decrypt/Hash operations.
    /// </summary>
    public static void Initialize(string? keyString)
    {
        if (string.IsNullOrWhiteSpace(keyString))
        {
            throw new InvalidOperationException(
                "Missing required ENCRYPTION_KEY. " +
                "Provide a base64-encoded 32-byte key. Generate one with: openssl rand -base64 32");
        }

        try
        {
            _key = Convert.FromBase64String(keyString);
        }
        catch (FormatException)
        {
            throw new InvalidOperationException(
                "ENCRYPTION_KEY must be a valid base64 string. " +
                "Generate one with: openssl rand -base64 32");
        }

        if (_key.Length != 32)
        {
            throw new InvalidOperationException(
                $"ENCRYPTION_KEY must decode to exactly 32 bytes for AES-256-GCM. " +
                $"Current decoded length: {_key.Length} bytes. " +
                "Generate one with: openssl rand -base64 32");
        }
    }

    private static byte[] Key => _key ?? throw new InvalidOperationException(
        "EncryptionService has not been initialized. Call EncryptionService.Initialize(key) first.");

    /// <summary>
    /// Encrypts plaintext using AES-256-GCM with a random 96-bit nonce.
    /// Returns base64(nonce || tag || ciphertext).
    /// </summary>
    public static string? Encrypt(string? plainText)
    {
        if (string.IsNullOrWhiteSpace(plainText))
            return null;

        var plainBytes = Encoding.UTF8.GetBytes(plainText);
        var nonce = new byte[AesGcm.NonceByteSizes.MaxSize]; // 12 bytes
        var tag = new byte[AesGcm.TagByteSizes.MaxSize];     // 16 bytes
        var cipherBytes = new byte[plainBytes.Length];

        RandomNumberGenerator.Fill(nonce);

        using var aes = new AesGcm(Key, 16);
        aes.Encrypt(nonce, plainBytes, cipherBytes, tag);

        // Output: nonce (12) || tag (16) || ciphertext
        var output = new byte[nonce.Length + tag.Length + cipherBytes.Length];
        Buffer.BlockCopy(nonce, 0, output, 0, nonce.Length);
        Buffer.BlockCopy(tag, 0, output, nonce.Length, tag.Length);
        Buffer.BlockCopy(cipherBytes, 0, output, nonce.Length + tag.Length, cipherBytes.Length);

        return Convert.ToBase64String(output);
    }

    /// <summary>
    /// Decrypts base64(nonce || tag || ciphertext) produced by Encrypt.
    /// Throws CryptographicException on tampered or malformed input.
    /// </summary>
    public static string? Decrypt(string? cipherText)
    {
        if (string.IsNullOrWhiteSpace(cipherText))
            return null;

        var fullCipher = Convert.FromBase64String(cipherText);

        const int nonceSize = 12; // AesGcm.NonceByteSizes.MaxSize
        const int tagSize = 16;   // AesGcm.TagByteSizes.MaxSize

        if (fullCipher.Length < nonceSize + tagSize)
        {
            throw new CryptographicException("Ciphertext is too short to contain a valid nonce and tag.");
        }

        var nonce = new byte[nonceSize];
        var tag = new byte[tagSize];
        var cipherBytes = new byte[fullCipher.Length - nonceSize - tagSize];

        Buffer.BlockCopy(fullCipher, 0, nonce, 0, nonceSize);
        Buffer.BlockCopy(fullCipher, nonceSize, tag, 0, tagSize);
        Buffer.BlockCopy(fullCipher, nonceSize + tagSize, cipherBytes, 0, cipherBytes.Length);

        var plainBytes = new byte[cipherBytes.Length];

        using var aes = new AesGcm(Key, 16);
        aes.Decrypt(nonce, cipherBytes, tag, plainBytes);

        return Encoding.UTF8.GetString(plainBytes);
    }

    public static string? NormalizeEmail(string? email)
    {
        if (string.IsNullOrWhiteSpace(email))
            return null;

        return email.Trim().ToLowerInvariant();
    }

    public static bool EmailMatchesEncryptedValue(string? encryptedEmail, string? plainTextEmail)
    {
        var normalized = NormalizeEmail(plainTextEmail);
        if (normalized == null)
            return false;

        try
        {
            return NormalizeEmail(Decrypt(encryptedEmail)) == normalized;
        }
        catch
        {
            return false;
        }
    }

    /// <summary>
    /// Keyed HMAC-SHA256 for deterministic, collision-resistant hash.
    /// Uses ENCRYPTION_KEY as HMAC key. Suitable for GDPR pseudonymization
    /// where identical inputs must produce identical outputs.
    /// </summary>
    public static string Hash(string input)
    {
        using var hmac = new HMACSHA256(Key);
        var bytes = Encoding.UTF8.GetBytes(input.ToLowerInvariant());
        return Convert.ToBase64String(hmac.ComputeHash(bytes));
    }
}
