namespace DevDock.Core.Services;

public interface ICredentialService
{
    Task SetSecretAsync(string key, string secret);
    Task<string?> GetSecretAsync(string key);
    Task<bool> HasSecretAsync(string key);
    Task DeleteSecretAsync(string key);
    string MaskSecret(string? secret);
}
