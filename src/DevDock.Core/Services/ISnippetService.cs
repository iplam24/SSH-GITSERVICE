using DevDock.Core.Models;

namespace DevDock.Core.Services;

public interface ISnippetService
{
    Task<List<SnippetItem>> GetAllAsync();
    Task<SnippetItem> SaveAsync(SnippetItem snippet);
    Task<bool> DeleteAsync(string id);
    Task<SnippetItem?> IncrementUseAsync(string id);
}
