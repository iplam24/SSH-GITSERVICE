using DevDock.Core.Models;
using Xunit;

namespace DevDock.Tests;

public class SshControlCenterTests
{
    [Fact]
    public void SshServerMetadata_SerializationAndDefaults_AreValid()
    {
        var meta = new SshServerMetadata();
        Assert.NotNull(meta.Domains);
        Assert.NotNull(meta.GitDeployments);
        Assert.NotNull(meta.CustomSnippets);
        Assert.Empty(meta.Domains);

        meta.Domains.Add(new SshDomainItem
        {
            Domain = "api.example.com",
            ResolvedIp = "1.2.3.4",
            IsPointingToThisServer = true,
            HasSsl = true,
            SslExpiry = "2026-12-31"
        });

        meta.GitDeployments.Add(new SshGitDeploymentItem
        {
            RepoUrl = "https://github.com/myorg/myapp.git",
            TargetPath = "/var/www/myapp",
            Branch = "main",
            PostDeployCommand = "npm install && npm run build"
        });

        meta.CustomSnippets.Add(new SshSavedSnippet
        {
            Name = "Check Disk",
            Command = "df -h"
        });

        Assert.Single(meta.Domains);
        Assert.True(meta.Domains[0].IsPointingToThisServer);
        Assert.Single(meta.GitDeployments);
        Assert.Equal("/var/www/myapp", meta.GitDeployments[0].TargetPath);
        Assert.Single(meta.CustomSnippets);
        Assert.Equal("df -h", meta.CustomSnippets[0].Command);
    }

    [Fact]
    public void SshListeningPortItem_Properties_WorkCorrectly()
    {
        var port = new SshListeningPortItem
        {
            Protocol = "tcp",
            LocalAddress = "0.0.0.0:80",
            Port = 80,
            State = "LISTEN",
            ProcessName = "nginx",
            Pid = 1234
        };

        Assert.Equal("tcp", port.Protocol);
        Assert.Equal(80, port.Port);
        Assert.Equal("nginx", port.ProcessName);
        Assert.Equal(1234, port.Pid);
    }

    [Fact]
    public void SshNginxSaveRequest_SupportsReverseProxyAndSpa()
    {
        var proxyReq = new SshNginxSaveRequest
        {
            SiteName = "backend.conf",
            DomainNames = "api.test.com",
            ProxyPassHost = "http://127.0.0.1",
            ProxyPassPort = 5000,
            EnableWebSocket = true
        };

        Assert.Equal("backend.conf", proxyReq.SiteName);
        Assert.Equal(5000, proxyReq.ProxyPassPort);
        Assert.True(proxyReq.EnableWebSocket);

        var spaReq = new SshNginxSaveRequest
        {
            SiteName = "frontend.conf",
            DomainNames = "app.test.com",
            IsSpaStatic = true,
            StaticRootPath = "/var/www/frontend/dist"
        };

        Assert.True(spaReq.IsSpaStatic);
        Assert.Equal("/var/www/frontend/dist", spaReq.StaticRootPath);
    }

    [Fact]
    public void SshCertbotCertificateItem_TracksDaysRemaining()
    {
        var cert = new SshCertbotCertificateItem
        {
            DomainName = "mycoolsite.com",
            ExpiryDate = "2026-11-20",
            CertificatePath = "/etc/letsencrypt/live/mycoolsite.com/fullchain.pem",
            DaysRemaining = 60
        };

        Assert.Equal("mycoolsite.com", cert.DomainName);
        Assert.Equal(60, cert.DaysRemaining);
        Assert.True(cert.DaysRemaining > 0);
    }
}
