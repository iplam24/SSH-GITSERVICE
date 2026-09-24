using System.Text;
using System.Text.Json;
using DevDock.Core.Models;
using DevDock.Core.Services;

namespace DevDock.Settings.Services;

/// <summary>
/// Quản lý snippet lệnh terminal hay dùng, lưu tại %AppData%/DevDock/snippets.json.
/// </summary>
public class SnippetService : ISnippetService
{
    private readonly string _storagePath;
    private readonly SemaphoreSlim _lock = new(1, 1);
    private List<SnippetItem> _snippets = new();
    private bool _isLoaded;

    public SnippetService(string? storageDirectory = null)
    {
        var dir = storageDirectory ?? Path.Combine(
            Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData), "DevDock");
        Directory.CreateDirectory(dir);
        _storagePath = Path.Combine(dir, "snippets.json");
    }

    private async Task EnsureLoadedAsync()
    {
        if (_isLoaded) return;
        if (File.Exists(_storagePath))
        {
            try
            {
                var json = await File.ReadAllTextAsync(_storagePath, Encoding.UTF8);
                _snippets = JsonSerializer.Deserialize<List<SnippetItem>>(json) ?? new();
            }
            catch
            {
                _snippets = new();
            }
        }
        _isLoaded = true;
    }

    private async Task SaveInternalAsync()
    {
        var json = JsonSerializer.Serialize(_snippets, new JsonSerializerOptions { WriteIndented = true });
        await File.WriteAllTextAsync(_storagePath, json, Encoding.UTF8);
    }

    public async Task<List<SnippetItem>> GetAllAsync()
    {
        await _lock.WaitAsync();
        try
        {
            await EnsureLoadedAsync();
            return _snippets
                .OrderByDescending(s => s.UseCount)
                .ThenBy(s => s.Group)
                .ThenBy(s => s.Title)
                .ToList();
        }
        finally
        {
            _lock.Release();
        }
    }

    public async Task<SnippetItem> SaveAsync(SnippetItem snippet)
    {
        await _lock.WaitAsync();
        try
        {
            await EnsureLoadedAsync();

            if (string.IsNullOrWhiteSpace(snippet.Id))
            {
                snippet.Id = Guid.NewGuid().ToString("N");
            }
            if (string.IsNullOrWhiteSpace(snippet.Group))
            {
                snippet.Group = "General";
            }

            var existing = _snippets.FirstOrDefault(s => s.Id == snippet.Id);
            if (existing != null)
            {
                existing.Title = snippet.Title;
                existing.Command = snippet.Command;
                existing.Group = snippet.Group;
                existing.Description = snippet.Description;
                existing.ProjectId = snippet.ProjectId;
            }
            else
            {
                _snippets.Add(snippet);
            }

            await SaveInternalAsync();
            return existing ?? snippet;
        }
        finally
        {
            _lock.Release();
        }
    }

    public async Task<bool> DeleteAsync(string id)
    {
        await _lock.WaitAsync();
        try
        {
            await EnsureLoadedAsync();
            var removed = _snippets.RemoveAll(s => s.Id == id) > 0;
            if (removed) await SaveInternalAsync();
            return removed;
        }
        finally
        {
            _lock.Release();
        }
    }

    public async Task<SnippetItem?> IncrementUseAsync(string id)
    {
        await _lock.WaitAsync();
        try
        {
            await EnsureLoadedAsync();
            var item = _snippets.FirstOrDefault(s => s.Id == id);
            if (item == null) return null;
            item.UseCount++;
            await SaveInternalAsync();
            return item;
        }
        finally
        {
            _lock.Release();
        }
    }
}
