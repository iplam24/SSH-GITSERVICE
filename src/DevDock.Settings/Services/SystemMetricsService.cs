using System.Diagnostics;
using System.Net.NetworkInformation;
using System.Runtime.InteropServices;
using DevDock.Core.Models;
using DevDock.Core.Services;

namespace DevDock.Settings.Services;

public class SystemMetricsService : ISystemMetricsService
{
    private static long _prevIdleTime;
    private static long _prevKernelTime;
    private static long _prevUserTime;
    private static DateTime _prevTime = DateTime.UtcNow;
    private static long _prevBytesSent;
    private static long _prevBytesReceived;
    private static DateTime _prevNetTime = DateTime.UtcNow;
    private static readonly Stopwatch UptimeStopwatch = Stopwatch.StartNew();

    [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Auto)]
    private class MEMORYSTATUSEX
    {
        public uint dwLength;
        public uint dwMemoryLoad;
        public ulong ullTotalPhys;
        public ulong ullAvailPhys;
        public ulong ullTotalPageFile;
        public ulong ullAvailPageFile;
        public ulong ullTotalVirtual;
        public ulong ullAvailVirtual;
        public ulong ullAvailExtendedVirtual;

        public MEMORYSTATUSEX()
        {
            dwLength = (uint)Marshal.SizeOf(typeof(MEMORYSTATUSEX));
        }
    }

    [DllImport("kernel32.dll", CharSet = CharSet.Auto, SetLastError = true)]
    private static extern bool GlobalMemoryStatusEx([In, Out] MEMORYSTATUSEX lpBuffer);

    [DllImport("kernel32.dll", SetLastError = true)]
    private static extern bool GetSystemTimes(out long lpIdleTime, out long lpKernelTime, out long lpUserTime);

    public Task<SystemMetrics> GetCurrentMetricsAsync()
    {
        var metrics = new SystemMetrics
        {
            Uptime = UptimeStopwatch.Elapsed
        };

        // 1. CPU Usage
        metrics.CpuUsagePercent = CalculateCpuUsage();

        // 2. RAM
        var memStatus = new MEMORYSTATUSEX();
        if (GlobalMemoryStatusEx(memStatus))
        {
            metrics.TotalRamMb = Math.Round(memStatus.ullTotalPhys / (1024.0 * 1024.0), 1);
            metrics.AvailableRamMb = Math.Round(memStatus.ullAvailPhys / (1024.0 * 1024.0), 1);
            metrics.UsedRamMb = Math.Round(metrics.TotalRamMb - metrics.AvailableRamMb, 1);
            metrics.RamUsagePercent = memStatus.dwMemoryLoad;
        }

        // 3. Disk
        try
        {
            var systemDrive = Path.GetPathRoot(Environment.SystemDirectory);
            var drive = DriveInfo.GetDrives().FirstOrDefault(d => d.IsReady && d.Name.StartsWith(systemDrive ?? "C", StringComparison.OrdinalIgnoreCase));
            if (drive != null)
            {
                metrics.DiskTotalGb = Math.Round(drive.TotalSize / (1024.0 * 1024.0 * 1024.0), 1);
                metrics.DiskFreeGb = Math.Round(drive.AvailableFreeSpace / (1024.0 * 1024.0 * 1024.0), 1);
                var usedGb = metrics.DiskTotalGb - metrics.DiskFreeGb;
                metrics.DiskUsagePercent = Math.Round((usedGb / metrics.DiskTotalGb) * 100, 1);
            }
        }
        catch { }

        // 4. Network
        try
        {
            long currentSent = 0;
            long currentRecv = 0;
            foreach (var ni in NetworkInterface.GetAllNetworkInterfaces())
            {
                if (ni.OperationalStatus == OperationalStatus.Up &&
                    ni.NetworkInterfaceType != NetworkInterfaceType.Loopback)
                {
                    var stats = ni.GetIPStatistics();
                    currentSent += stats.BytesSent;
                    currentRecv += stats.BytesReceived;
                }
            }

            var now = DateTime.UtcNow;
            var elapsedSec = (now - _prevNetTime).TotalSeconds;
            if (elapsedSec > 0 && _prevBytesSent > 0)
            {
                var sentDelta = currentSent - _prevBytesSent;
                var recvDelta = currentRecv - _prevBytesReceived;
                if (sentDelta >= 0) metrics.NetworkSentKbps = Math.Round((sentDelta / elapsedSec) / 1024.0, 1);
                if (recvDelta >= 0) metrics.NetworkReceivedKbps = Math.Round((recvDelta / elapsedSec) / 1024.0, 1);
            }
            _prevBytesSent = currentSent;
            _prevBytesReceived = currentRecv;
            _prevNetTime = now;
        }
        catch { }

        return Task.FromResult(metrics);
    }

    private static double CalculateCpuUsage()
    {
        if (!GetSystemTimes(out var idleTime, out var kernelTime, out var userTime))
        {
            return 0;
        }

        if (_prevIdleTime == 0)
        {
            _prevIdleTime = idleTime;
            _prevKernelTime = kernelTime;
            _prevUserTime = userTime;
            return 5.0; // Initial sample
        }

        long usr = userTime - _prevUserTime;
        long ker = kernelTime - _prevKernelTime;
        long idl = idleTime - _prevIdleTime;

        long sys = ker + usr;
        double cpu = 0;
        if (sys > 0)
        {
            cpu = Math.Round(((sys - idl) * 100.0) / sys, 1);
        }

        _prevIdleTime = idleTime;
        _prevKernelTime = kernelTime;
        _prevUserTime = userTime;

        return Math.Clamp(cpu, 0.0, 100.0);
    }
}
