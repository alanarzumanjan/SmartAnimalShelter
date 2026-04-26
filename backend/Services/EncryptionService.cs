using System.Security.Cryptography;
using System.Text;

namespace Services;

public static class EncryptionService
{
    private static readonly string Key = Environment.GetEnvironmentVariable("ENCRYPTION_KEY") ?? "a3G!t8ZkL2#vN9@eQ4XpB1mR7wDfT6Hs";

    public static string? Encrypt(string? plainText)
    {
        if (string.IsNullOrWhiteSpace(plainText))
            return null;

        using var aes = Aes.Create();
        aes.Key = Encoding.UTF8.GetBytes(Key);
        aes.GenerateIV();

        using var encryptor = aes.CreateEncryptor(aes.Key, aes.IV);
        using var ms = new MemoryStream();
        ms.Write(aes.IV, 0, aes.IV.Length);
        using var cs = new CryptoStream(ms, encryptor, CryptoStreamMode.Write);
        using var sw = new StreamWriter(cs);
        sw.Write(plainText);
        sw.Flush();
        cs.FlushFinalBlock();

        return Convert.ToBase64String(ms.ToArray());
    }

    public static string? Decrypt(string? cipherText)
    {
        if (string.IsNullOrWhiteSpace(cipherText))
            return null;

        var fullCipher = Convert.FromBase64String(cipherText);

        using var aes = Aes.Create();
        aes.Key = Encoding.UTF8.GetBytes(Key);

        var iv = new byte[16];
        Array.Copy(fullCipher, iv, 16);
        aes.IV = iv;

        using var decryptor = aes.CreateDecryptor(aes.Key, aes.IV);
        using var ms = new MemoryStream(fullCipher, 16, fullCipher.Length - 16);
        using var cs = new CryptoStream(ms, decryptor, CryptoStreamMode.Read);
        using var sr = new StreamReader(cs);
        return sr.ReadToEnd();
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

    public static string Hash(string input)
    {
        using var sha256 = SHA256.Create();
        var bytes = Encoding.UTF8.GetBytes(input.ToLowerInvariant());
        return Convert.ToBase64String(sha256.ComputeHash(bytes));
    }
}
