using System.Text.RegularExpressions;

public static class PriceResolver
{
    public static string? ExtractPrice(string? description)
    {
        if (string.IsNullOrWhiteSpace(description))
            return null;

        try
        {
            var match = Regex.Match(description, @"(\d[\d\s]*[\.,]?\d*)\s*€");
            if (!match.Success)
                return null;

            var raw = match.Groups[1].Value.Replace(" ", "").Replace(",", ".");
            return raw;
        }
        catch
        {
            return null;
        }
    }
}
