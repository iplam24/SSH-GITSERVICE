using System.Diagnostics;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using System.Text.Json.Nodes;
using DevDock.Core.Models;
using DevDock.Core.Services;

namespace DevDock.Settings.Services;

public class AiService : IAiService
{
    private readonly ICredentialService _credentialService;
    private readonly IGitService _gitService;
    private readonly string _storagePath;
    private readonly SemaphoreSlim _lock = new(1, 1);
    private List<AiProviderConfig> _cachedProviders = new();
    private bool _isLoaded;
    private static readonly HttpClient HttpClient = new()
    {
        Timeout = TimeSpan.FromSeconds(60)
    };

    public AiService(ICredentialService credentialService, IGitService gitService, string? storageDirectory = null)
    {
        _credentialService = credentialService;
        _gitService = gitService;
        var dir = storageDirectory ?? Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData), "DevDock");
        Directory.CreateDirectory(dir);
        _storagePath = Path.Combine(dir, "ai_providers.json");
    }

    private async Task EnsureLoadedAsync()
    {
        if (_isLoaded) return;

        if (File.Exists(_storagePath))
        {
            try
            {
                var json = await File.ReadAllTextAsync(_storagePath, Encoding.UTF8);
                _cachedProviders = JsonSerializer.Deserialize<List<AiProviderConfig>>(json, new JsonSerializerOptions
                {
                    PropertyNameCaseInsensitive = true
                }) ?? new();
            }
            catch
            {
                _cachedProviders = new();
            }
        }

        if (_cachedProviders.Count == 0)
        {
            // Seed popular provider presets
            _cachedProviders = GetDefaultPresets();
            await SaveInternalAsync();
        }
        else
        {
            // Ensure essential presets are available alongside user-added providers
            var defaults = GetDefaultPresets();
            var addedAny = false;
            foreach (var def in defaults)
            {
                if (!_cachedProviders.Any(p => p.ProviderType == def.ProviderType))
                {
                    _cachedProviders.Add(def);
                    addedAny = true;
                }
            }
            if (addedAny)
            {
                await SaveInternalAsync();
            }
        }

        _isLoaded = true;
    }

    private static List<AiProviderConfig> GetDefaultPresets()
    {
        return
        [
            new AiProviderConfig
            {
                Id = "preset_deepseek",
                Name = "DeepSeek AI",
                ProviderType = AiProviderType.DeepSeek,
                ApiBaseUrl = "https://api.deepseek.com",
                DefaultModel = "deepseek-chat",
                IsDefault = true,
                Status = "untested"
            },
            new AiProviderConfig
            {
                Id = "preset_openai",
                Name = "OpenAI",
                ProviderType = AiProviderType.OpenAI,
                ApiBaseUrl = "https://api.openai.com/v1",
                DefaultModel = "gpt-4o",
                IsDefault = false,
                Status = "untested"
            },
            new AiProviderConfig
            {
                Id = "preset_claude",
                Name = "Anthropic Claude",
                ProviderType = AiProviderType.Anthropic,
                ApiBaseUrl = "https://api.anthropic.com/v1",
                DefaultModel = "claude-3-7-sonnet-20250219",
                IsDefault = false,
                Status = "untested"
            },
            new AiProviderConfig
            {
                Id = "preset_gemini",
                Name = "Google Gemini",
                ProviderType = AiProviderType.Gemini,
                ApiBaseUrl = "https://generativelanguage.googleapis.com",
                DefaultModel = "gemini-2.0-flash",
                IsDefault = false,
                Status = "untested"
            },
            new AiProviderConfig
            {
                Id = "preset_ollama",
                Name = "Ollama (Local LLM)",
                ProviderType = AiProviderType.Ollama,
                ApiBaseUrl = "http://localhost:11434",
                DefaultModel = "llama3",
                IsDefault = false,
                HasKey = true,
                MaskedKey = "local (no key required)",
                Status = "untested"
            },
            new AiProviderConfig
            {
                Id = "preset_groq",
                Name = "Groq (Ultra-fast)",
                ProviderType = AiProviderType.Groq,
                ApiBaseUrl = "https://api.groq.com/openai/v1",
                DefaultModel = "llama-3.3-70b-versatile",
                IsDefault = false,
                Status = "untested"
            },
            new AiProviderConfig
            {
                Id = "preset_openrouter",
                Name = "OpenRouter",
                ProviderType = AiProviderType.OpenRouter,
                ApiBaseUrl = "https://openrouter.ai/api/v1",
                DefaultModel = "anthropic/claude-3.5-sonnet",
                IsDefault = false,
                Status = "untested"
            }
        ];
    }

    private async Task SaveInternalAsync()
    {
        var json = JsonSerializer.Serialize(_cachedProviders, new JsonSerializerOptions
        {
            WriteIndented = true,
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase
        });
        await File.WriteAllTextAsync(_storagePath, json, Encoding.UTF8);
    }

    public async Task<List<AiProviderConfig>> GetProvidersAsync()
    {
        await _lock.WaitAsync();
        try
        {
            await EnsureLoadedAsync();
            return _cachedProviders.OrderByDescending(p => p.IsDefault).ThenBy(p => p.Name).ToList();
        }
        finally
        {
            _lock.Release();
        }
    }

    public async Task<AiProviderConfig?> GetProviderByIdAsync(string id)
    {
        await _lock.WaitAsync();
        try
        {
            await EnsureLoadedAsync();
            return _cachedProviders.FirstOrDefault(p => p.Id == id);
        }
        finally
        {
            _lock.Release();
        }
    }

    public async Task<AiProviderConfig> SaveProviderAsync(AiProviderConfig config, string? apiKey)
    {
        await _lock.WaitAsync();
        try
        {
            await EnsureLoadedAsync();

            if (string.IsNullOrWhiteSpace(config.Id))
            {
                config.Id = Guid.NewGuid().ToString("N");
            }

            if (config.IsDefault)
            {
                foreach (var p in _cachedProviders)
                {
                    p.IsDefault = false;
                }
            }

            if (!string.IsNullOrWhiteSpace(apiKey))
            {
                await _credentialService.SetSecretAsync($"devdock_ai_{config.Id}", apiKey.Trim());
                config.HasKey = true;
                config.MaskedKey = MaskKey(apiKey.Trim());
            }

            var index = _cachedProviders.FindIndex(p => p.Id == config.Id);
            if (index >= 0)
            {
                // Preserve key status if not passed
                if (string.IsNullOrWhiteSpace(apiKey))
                {
                    config.HasKey = _cachedProviders[index].HasKey;
                    config.MaskedKey = _cachedProviders[index].MaskedKey;
                    config.Status = _cachedProviders[index].Status;
                    config.LastLatencyMs = _cachedProviders[index].LastLatencyMs;
                    config.LastTestedAt = _cachedProviders[index].LastTestedAt;
                }
                _cachedProviders[index] = config;
            }
            else
            {
                // Ensure at least one default
                if (!_cachedProviders.Any(p => p.IsDefault))
                {
                    config.IsDefault = true;
                }
                _cachedProviders.Add(config);
            }

            await SaveInternalAsync();
            return config;
        }
        finally
        {
            _lock.Release();
        }
    }

    public async Task<bool> DeleteProviderAsync(string id)
    {
        await _lock.WaitAsync();
        try
        {
            await EnsureLoadedAsync();
            var item = _cachedProviders.FirstOrDefault(p => p.Id == id);
            if (item == null) return false;

            _cachedProviders.Remove(item);
            await _credentialService.DeleteSecretAsync($"devdock_ai_{id}");

            if (item.IsDefault && _cachedProviders.Count > 0)
            {
                _cachedProviders[0].IsDefault = true;
            }

            await SaveInternalAsync();
            return true;
        }
        finally
        {
            _lock.Release();
        }
    }

    public async Task<bool> SetDefaultProviderAsync(string id)
    {
        await _lock.WaitAsync();
        try
        {
            await EnsureLoadedAsync();
            var target = _cachedProviders.FirstOrDefault(p => p.Id == id);
            if (target == null) return false;

            foreach (var p in _cachedProviders)
            {
                p.IsDefault = (p.Id == id);
            }

            await SaveInternalAsync();
            return true;
        }
        finally
        {
            _lock.Release();
        }
    }

    public async Task<AiTestResult> TestProviderAsync(string id)
    {
        var provider = await GetProviderByIdAsync(id);
        if (provider == null)
        {
            return new AiTestResult { Success = false, ErrorMessage = "Nhà cung cấp AI không tồn tại." };
        }

        string? apiKey = null;
        if (provider.ProviderType != AiProviderType.Ollama)
        {
            apiKey = await _credentialService.GetSecretAsync($"devdock_ai_{id}");
            if (string.IsNullOrWhiteSpace(apiKey))
            {
                return new AiTestResult
                {
                    Success = false,
                    ErrorMessage = "Chưa cấu hình API Key. Vui lòng nhập khóa API và bấm lưu."
                };
            }
        }

        var sw = Stopwatch.StartNew();
        try
        {
            var model = !string.IsNullOrWhiteSpace(provider.DefaultModel)
                ? provider.DefaultModel
                : (provider.ProviderType == AiProviderType.DeepSeek ? "deepseek-chat" : "gpt-4o-mini");

            var req = new AiChatRequest
            {
                ProviderId = id,
                Model = model,
                Temperature = 0.3,
                Messages = [new AiChatMessage { Role = "user", Content = "Ping. Answer with 'DevDock AI Connected'." }]
            };

            var res = await ExecuteCompletionAsync(provider, apiKey, req);
            sw.Stop();

            if (res.Success)
            {
                provider.Status = "active";
                provider.LastLatencyMs = sw.ElapsedMilliseconds;
                provider.LastTestedAt = DateTime.UtcNow;
                await SaveProviderAsync(provider, null);

                return new AiTestResult
                {
                    Success = true,
                    LatencyMs = sw.ElapsedMilliseconds,
                    ModelUsed = res.ModelUsed,
                    ResponseMessage = res.Message
                };
            }
            else
            {
                provider.Status = "invalid";
                provider.LastTestedAt = DateTime.UtcNow;
                await SaveProviderAsync(provider, null);

                return new AiTestResult
                {
                    Success = false,
                    LatencyMs = sw.ElapsedMilliseconds,
                    ErrorMessage = res.ErrorMessage
                };
            }
        }
        catch (Exception ex)
        {
            sw.Stop();
            provider.Status = "invalid";
            provider.LastTestedAt = DateTime.UtcNow;
            await SaveProviderAsync(provider, null);

            return new AiTestResult
            {
                Success = false,
                LatencyMs = sw.ElapsedMilliseconds,
                ErrorMessage = ex.Message
            };
        }
    }

    public async Task<AiTestResult> TestDirectConfigAsync(SaveAiProviderRequest request)
    {
        var config = request.Config;
        if (config == null)
        {
            return new AiTestResult { Success = false, ErrorMessage = "Cấu hình AI không hợp lệ." };
        }

        string? apiKey = request.ApiKey;
        if (string.IsNullOrWhiteSpace(apiKey) && !string.IsNullOrWhiteSpace(config.Id) && config.ProviderType != AiProviderType.Ollama)
        {
            apiKey = await _credentialService.GetSecretAsync($"devdock_ai_{config.Id}");
        }

        if (config.ProviderType != AiProviderType.Ollama && string.IsNullOrWhiteSpace(apiKey))
        {
            return new AiTestResult
            {
                Success = false,
                ErrorMessage = "Vui lòng nhập khóa API (API Key) để kiểm tra kết nối."
            };
        }

        var model = !string.IsNullOrWhiteSpace(config.DefaultModel)
            ? config.DefaultModel
            : (config.ProviderType == AiProviderType.DeepSeek ? "deepseek-chat" : "gpt-4o-mini");

        var sw = Stopwatch.StartNew();
        try
        {
            var req = new AiChatRequest
            {
                ProviderId = config.Id,
                Model = model,
                Temperature = 0.3,
                Messages = [new AiChatMessage { Role = "user", Content = "Ping. Answer with 'DevDock AI Connected'." }]
            };

            var res = await ExecuteCompletionAsync(config, apiKey, req);
            sw.Stop();

            return new AiTestResult
            {
                Success = res.Success,
                LatencyMs = sw.ElapsedMilliseconds,
                ModelUsed = res.ModelUsed,
                ResponseMessage = res.Message,
                ErrorMessage = res.ErrorMessage
            };
        }
        catch (Exception ex)
        {
            sw.Stop();
            return new AiTestResult
            {
                Success = false,
                LatencyMs = sw.ElapsedMilliseconds,
                ErrorMessage = ex.Message
            };
        }
    }

    public async Task<AiChatResponse> ChatAsync(AiChatRequest request)
    {
        await _lock.WaitAsync();
        AiProviderConfig? provider = null;
        try
        {
            await EnsureLoadedAsync();
            if (!string.IsNullOrWhiteSpace(request.ProviderId))
            {
                provider = _cachedProviders.FirstOrDefault(p => p.Id == request.ProviderId);
            }
            provider ??= _cachedProviders.FirstOrDefault(p => p.IsDefault) ?? _cachedProviders.FirstOrDefault();
        }
        finally
        {
            _lock.Release();
        }

        if (provider == null)
        {
            return new AiChatResponse
            {
                Success = false,
                ErrorMessage = "Chưa có nhà cung cấp AI nào được cấu hình trong DevDock."
            };
        }

        string? apiKey = null;
        if (provider.ProviderType != AiProviderType.Ollama)
        {
            apiKey = await _credentialService.GetSecretAsync($"devdock_ai_{provider.Id}");
            if (string.IsNullOrWhiteSpace(apiKey))
            {
                return new AiChatResponse
                {
                    Success = false,
                    ErrorMessage = $"Nhà cung cấp '{provider.Name}' chưa có API Key hợp lệ trong bảo mật DPAPI."
                };
            }
        }

        return await ExecuteCompletionAsync(provider, apiKey, request);
    }

    public async Task<AiChatResponse> GenerateCommitMessageAsync(AiGenerateCommitRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.RepoPath) || !Directory.Exists(request.RepoPath))
        {
            return new AiChatResponse { Success = false, ErrorMessage = "Đường dẫn kho Git không hợp lệ." };
        }

        string diffText = string.Empty;
        try
        {
            // First check staged diff
            var stagedDiff = await RunGitCommandAsync(request.RepoPath, "diff --cached");
            if (!string.IsNullOrWhiteSpace(stagedDiff))
            {
                diffText = stagedDiff;
            }
            else
            {
                // Fallback to unstaged diff
                var unstagedDiff = await RunGitCommandAsync(request.RepoPath, "diff HEAD");
                diffText = unstagedDiff;
            }

            if (string.IsNullOrWhiteSpace(diffText))
            {
                // Fallback to git status summary
                diffText = await RunGitCommandAsync(request.RepoPath, "status --short");
            }
        }
        catch (Exception ex)
        {
            return new AiChatResponse { Success = false, ErrorMessage = $"Lỗi đọc Git diff: {ex.Message}" };
        }

        if (string.IsNullOrWhiteSpace(diffText))
        {
            return new AiChatResponse
            {
                Success = false,
                ErrorMessage = "Kho Git đang sạch (Clean), không có thay đổi nào để tạo commit message."
            };
        }

        // Truncate diff if very long to prevent token overflow
        if (diffText.Length > 8000)
        {
            diffText = diffText[..8000] + "\n...[Diff truncated for AI prompt]";
        }

        var systemPrompt = @"You are an expert Git commit generator following the Conventional Commits specification.
Generate a clean, high quality commit message based on the provided Git diff.
Rules:
1. Format: <type>(<optional scope>): <short description in Vietnamese or English based on repo context>
2. Types: feat, fix, refactor, docs, style, test, chore, perf
3. Keep the subject line concise (under 72 chars).
4. If there are multiple significant changes, add a bulleted list in the body after a blank line.
5. Do NOT output markdown code blocks (no ```). Output ONLY the raw commit message text.";

        var prompt = $"Generate a conventional commit message for these git changes:\n\n{diffText}";
        if (!string.IsNullOrWhiteSpace(request.CustomInstructions))
        {
            prompt += $"\n\nAdditional user instructions: {request.CustomInstructions}";
        }

        var chatReq = new AiChatRequest
        {
            ProviderId = request.ProviderId,
            Model = request.Model,
            SystemPrompt = systemPrompt,
            Temperature = 0.2,
            Messages = [new AiChatMessage { Role = "user", Content = prompt }]
        };

        return await ChatAsync(chatReq);
    }

    private async Task<AiChatResponse> ExecuteCompletionAsync(AiProviderConfig provider, string? apiKey, AiChatRequest request)
    {
        var model = !string.IsNullOrWhiteSpace(request.Model) ? request.Model : provider.DefaultModel;
        var sw = Stopwatch.StartNew();

        try
        {
            return provider.ProviderType switch
            {
                AiProviderType.Anthropic => await CallAnthropicAsync(provider, apiKey, model, request, sw),
                AiProviderType.Gemini => await CallGeminiAsync(provider, apiKey, model, request, sw),
                _ => await CallOpenAiCompatibleAsync(provider, apiKey, model, request, sw)
            };
        }
        catch (Exception ex)
        {
            sw.Stop();
            return new AiChatResponse
            {
                Success = false,
                ModelUsed = model,
                DurationMs = sw.ElapsedMilliseconds,
                ErrorMessage = $"Lỗi kết nối tới {provider.Name}: {ex.Message}"
            };
        }
    }

    private async Task<AiChatResponse> CallOpenAiCompatibleAsync(
        AiProviderConfig provider,
        string? apiKey,
        string model,
        AiChatRequest request,
        Stopwatch sw)
    {
        var baseUrl = !string.IsNullOrWhiteSpace(provider.ApiBaseUrl)
            ? provider.ApiBaseUrl.TrimEnd('/')
            : "https://api.openai.com/v1";

        // Ollama usually uses /api/chat or /v1/chat/completions
        var endpoint = $"{baseUrl}/chat/completions";
        if (provider.ProviderType == AiProviderType.Ollama && !baseUrl.Contains("/v1"))
        {
            endpoint = $"{baseUrl}/v1/chat/completions";
        }

        var messagesList = new List<object>();
        if (!string.IsNullOrWhiteSpace(request.SystemPrompt))
        {
            messagesList.Add(new { role = "system", content = request.SystemPrompt });
        }
        foreach (var m in request.Messages)
        {
            messagesList.Add(new { role = m.Role.ToLowerInvariant(), content = m.Content });
        }

        var payload = new
        {
            model = model,
            messages = messagesList,
            temperature = request.Temperature,
            max_tokens = 2048,
            stream = false
        };

        using var httpRequest = new HttpRequestMessage(HttpMethod.Post, endpoint);
        if (!string.IsNullOrWhiteSpace(apiKey) && provider.ProviderType != AiProviderType.Ollama)
        {
            httpRequest.Headers.Authorization = new AuthenticationHeaderValue("Bearer", apiKey);
        }
        httpRequest.Content = new StringContent(JsonSerializer.Serialize(payload), Encoding.UTF8, "application/json");

        var response = await HttpClient.SendAsync(httpRequest);
        var responseBody = await response.Content.ReadAsStringAsync();
        sw.Stop();

        if (!response.IsSuccessStatusCode)
        {
            return new AiChatResponse
            {
                Success = false,
                ModelUsed = model,
                DurationMs = sw.ElapsedMilliseconds,
                ErrorMessage = $"HTTP {(int)response.StatusCode} ({response.ReasonPhrase}): {responseBody}"
            };
        }

        var node = JsonNode.Parse(responseBody);
        var message = node?["choices"]?[0]?["message"]?["content"]?.ToString() ?? string.Empty;

        return new AiChatResponse
        {
            Success = true,
            Message = message.Trim(),
            ModelUsed = model,
            DurationMs = sw.ElapsedMilliseconds
        };
    }

    private async Task<AiChatResponse> CallAnthropicAsync(
        AiProviderConfig provider,
        string? apiKey,
        string model,
        AiChatRequest request,
        Stopwatch sw)
    {
        var baseUrl = !string.IsNullOrWhiteSpace(provider.ApiBaseUrl)
            ? provider.ApiBaseUrl.TrimEnd('/')
            : "https://api.anthropic.com/v1";

        var endpoint = $"{baseUrl}/messages";
        var messagesList = new List<object>();
        foreach (var m in request.Messages)
        {
            if (m.Role.Equals("system", StringComparison.OrdinalIgnoreCase)) continue;
            messagesList.Add(new { role = m.Role.ToLowerInvariant(), content = m.Content });
        }

        var payload = new Dictionary<string, object?>
        {
            ["model"] = model,
            ["messages"] = messagesList,
            ["max_tokens"] = 2048,
            ["temperature"] = request.Temperature
        };

        if (!string.IsNullOrWhiteSpace(request.SystemPrompt))
        {
            payload["system"] = request.SystemPrompt;
        }

        using var httpRequest = new HttpRequestMessage(HttpMethod.Post, endpoint);
        httpRequest.Headers.Add("x-api-key", apiKey);
        httpRequest.Headers.Add("anthropic-version", "2023-06-01");
        httpRequest.Content = new StringContent(JsonSerializer.Serialize(payload), Encoding.UTF8, "application/json");

        var response = await HttpClient.SendAsync(httpRequest);
        var responseBody = await response.Content.ReadAsStringAsync();
        sw.Stop();

        if (!response.IsSuccessStatusCode)
        {
            return new AiChatResponse
            {
                Success = false,
                ModelUsed = model,
                DurationMs = sw.ElapsedMilliseconds,
                ErrorMessage = $"HTTP {(int)response.StatusCode}: {responseBody}"
            };
        }

        var node = JsonNode.Parse(responseBody);
        var text = node?["content"]?[0]?["text"]?.ToString() ?? string.Empty;

        return new AiChatResponse
        {
            Success = true,
            Message = text.Trim(),
            ModelUsed = model,
            DurationMs = sw.ElapsedMilliseconds
        };
    }

    private async Task<AiChatResponse> CallGeminiAsync(
        AiProviderConfig provider,
        string? apiKey,
        string model,
        AiChatRequest request,
        Stopwatch sw)
    {
        var endpoint = $"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={apiKey}";

        var contents = new List<object>();
        foreach (var m in request.Messages)
        {
            var role = m.Role.Equals("assistant", StringComparison.OrdinalIgnoreCase) ? "model" : "user";
            contents.Add(new
            {
                role = role,
                parts = new[] { new { text = m.Content } }
            });
        }

        var payload = new Dictionary<string, object?>
        {
            ["contents"] = contents,
            ["generationConfig"] = new
            {
                temperature = request.Temperature,
                maxOutputTokens = 2048
            }
        };

        if (!string.IsNullOrWhiteSpace(request.SystemPrompt))
        {
            payload["systemInstruction"] = new
            {
                parts = new[] { new { text = request.SystemPrompt } }
            };
        }

        using var httpRequest = new HttpRequestMessage(HttpMethod.Post, endpoint);
        httpRequest.Content = new StringContent(JsonSerializer.Serialize(payload), Encoding.UTF8, "application/json");

        var response = await HttpClient.SendAsync(httpRequest);
        var responseBody = await response.Content.ReadAsStringAsync();
        sw.Stop();

        if (!response.IsSuccessStatusCode)
        {
            return new AiChatResponse
            {
                Success = false,
                ModelUsed = model,
                DurationMs = sw.ElapsedMilliseconds,
                ErrorMessage = $"HTTP {(int)response.StatusCode}: {responseBody}"
            };
        }

        var node = JsonNode.Parse(responseBody);
        var text = node?["candidates"]?[0]?["content"]?["parts"]?[0]?["text"]?.ToString() ?? string.Empty;

        return new AiChatResponse
        {
            Success = true,
            Message = text.Trim(),
            ModelUsed = model,
            DurationMs = sw.ElapsedMilliseconds
        };
    }

    private static async Task<string> RunGitCommandAsync(string repoPath, string arguments)
    {
        var psi = new ProcessStartInfo
        {
            FileName = "git",
            Arguments = arguments,
            WorkingDirectory = repoPath,
            RedirectStandardOutput = true,
            RedirectStandardError = true,
            UseShellExecute = false,
            CreateNoWindow = true,
            StandardOutputEncoding = Encoding.UTF8
        };

        using var proc = Process.Start(psi);
        if (proc == null) return string.Empty;

        var output = await proc.StandardOutput.ReadToEndAsync();
        await proc.WaitForExitAsync();
        return output.Trim();
    }

    private static string MaskKey(string key)
    {
        if (string.IsNullOrEmpty(key)) return string.Empty;
        if (key.Length <= 8) return "••••••••";
        var prefix = key[..Math.Min(6, key.Length / 2)];
        var suffix = key[^Math.Min(4, key.Length / 4)..];
        return $"{prefix}...{suffix}";
    }
}
