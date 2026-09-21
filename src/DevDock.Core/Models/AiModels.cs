namespace DevDock.Core.Models;

public enum AiProviderType
{
    OpenAI,
    Anthropic,
    Gemini,
    DeepSeek,
    Ollama,
    Groq,
    OpenRouter,
    Custom
}

public class AiProviderConfig
{
    public string Id { get; set; } = Guid.NewGuid().ToString("N");
    public string Name { get; set; } = string.Empty;
    public AiProviderType ProviderType { get; set; } = AiProviderType.OpenAI;
    public string ApiBaseUrl { get; set; } = string.Empty;
    public string DefaultModel { get; set; } = string.Empty;
    public bool IsDefault { get; set; }
    public bool HasKey { get; set; }
    public string MaskedKey { get; set; } = string.Empty;
    public string Status { get; set; } = "untested"; // active, invalid, untested
    public long LastLatencyMs { get; set; }
    public DateTime? LastTestedAt { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

public class SaveAiProviderRequest
{
    public AiProviderConfig Config { get; set; } = new();
    public string? ApiKey { get; set; }
}

public class AiTestResult
{
    public bool Success { get; set; }
    public long LatencyMs { get; set; }
    public string? ModelUsed { get; set; }
    public string? ResponseMessage { get; set; }
    public string? ErrorMessage { get; set; }
}

public class AiChatMessage
{
    public string Role { get; set; } = "user"; // user, assistant, system
    public string Content { get; set; } = string.Empty;
    public DateTime Timestamp { get; set; } = DateTime.UtcNow;
}

public class AiChatRequest
{
    public string? ProviderId { get; set; }
    public string? Model { get; set; }
    public List<AiChatMessage> Messages { get; set; } = new();
    public double Temperature { get; set; } = 0.3;
    public string? SystemPrompt { get; set; }
}

public class AiChatResponse
{
    public bool Success { get; set; }
    public string Message { get; set; } = string.Empty;
    public string ModelUsed { get; set; } = string.Empty;
    public long DurationMs { get; set; }
    public string? ErrorMessage { get; set; }
}

public class AiGenerateCommitRequest
{
    public string RepoPath { get; set; } = string.Empty;
    public string? ProviderId { get; set; }
    public string? Model { get; set; }
    public string? CustomInstructions { get; set; }
}
