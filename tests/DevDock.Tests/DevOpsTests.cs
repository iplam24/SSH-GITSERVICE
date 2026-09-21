using DevDock.Core.Models;
using DevDock.Settings.Services;
using Xunit;

namespace DevDock.Tests;

public class DevOpsTests
{
    [Fact]
    public async Task GetListeningPorts_ReturnsNonEmptyList()
    {
        var svc = new DevOpsService();
        var ports = await svc.GetListeningPortsAsync();

        Assert.NotNull(ports);
        // Windows always has listening system or local ports (RPC, DNS, or DevDock test runner)
        Assert.True(ports.Count > 0, "Expected at least one listening port on Windows.");

        var first = ports[0];
        Assert.True(first.Port > 0);
        Assert.False(string.IsNullOrEmpty(first.Protocol));
    }

    [Fact]
    public async Task CompareDotEnv_IdentifiesMissingAndExtraKeys()
    {
        var svc = new DevOpsService();

        var currentEnv = @"
PORT=3000
DATABASE_URL=postgres://localhost:5432/mydb
DEBUG=true
EXTRA_KEY=something_extra
";

        var exampleEnv = @"
PORT=8080
DATABASE_URL=postgres://user:pass@host:5432/db
SECRET_KEY=your_jwt_secret_here
API_KEY=your_api_key
";

        var result = await svc.CompareDotEnvAsync(currentEnv, exampleEnv);

        Assert.NotNull(result);
        Assert.Equal(2, result.MissingKeysCount); // SECRET_KEY and API_KEY are missing in current
        Assert.Equal(2, result.ExtraKeysCount);   // DEBUG and EXTRA_KEY are extra in current

        var secretDiff = result.DiffEntries.FirstOrDefault(x => x.Key.Equals("SECRET_KEY", StringComparison.OrdinalIgnoreCase));
        Assert.NotNull(secretDiff);
        Assert.Equal("missing", secretDiff.Status);

        var extraDiff = result.DiffEntries.FirstOrDefault(x => x.Key.Equals("EXTRA_KEY", StringComparison.OrdinalIgnoreCase));
        Assert.NotNull(extraDiff);
        Assert.Equal("extra", extraDiff.Status);

        var portDiff = result.DiffEntries.FirstOrDefault(x => x.Key.Equals("PORT", StringComparison.OrdinalIgnoreCase));
        Assert.NotNull(portDiff);
        Assert.Equal("different_value", portDiff.Status);
    }

    [Fact]
    public async Task GetEnvironmentVariables_ReturnsUserAndMachineVariablesWithPathItems()
    {
        var svc = new DevOpsService();
        var vars = await svc.GetEnvironmentVariablesAsync();

        Assert.NotNull(vars);
        Assert.True(vars.Count > 0);

        var pathVar = vars.FirstOrDefault(v => v.Name.Equals("PATH", StringComparison.OrdinalIgnoreCase));
        if (pathVar != null)
        {
            Assert.True(pathVar.IsPath);
            Assert.True(pathVar.PathItems.Count > 0);
            // Verify that at least some path items exist (e.g. C:\Windows\System32)
            Assert.Contains(pathVar.PathItems, p => p.Exists);
        }
    }

    [Fact]
    public async Task KillProcess_DisallowsCriticalSystemPids()
    {
        var svc = new DevOpsService();
        var res0 = await svc.KillProcessByPidAsync(0);
        Assert.False(res0.Success);

        var res4 = await svc.KillProcessByPidAsync(4);
        Assert.False(res4.Success);
    }
}
