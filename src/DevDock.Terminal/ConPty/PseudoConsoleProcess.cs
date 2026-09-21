using System.ComponentModel;
using System.Runtime.InteropServices;
using Microsoft.Win32.SafeHandles;

namespace DevDock.Terminal.ConPty;

public class PseudoConsoleProcess : IDisposable
{
    private IntPtr _hPC = IntPtr.Zero;
    private SafeFileHandle? _hPipeInWrite;
    private SafeFileHandle? _hPipeOutRead;
    private IntPtr _hProcess = IntPtr.Zero;
    private IntPtr _hThread = IntPtr.Zero;
    private IntPtr _lpAttributeList = IntPtr.Zero;
    private bool _disposed;

    public int ProcessId { get; private set; }
    public Stream? InputStream { get; private set; }
    public Stream? OutputStream { get; private set; }

    public static PseudoConsoleProcess Start(string commandLine, string? workingDir, int cols, int rows)
    {
        var proc = new PseudoConsoleProcess();
        proc.Initialize(commandLine, workingDir, cols, rows);
        return proc;
    }

    private void Initialize(string commandLine, string? workingDir, int cols, int rows)
    {
        var sa = new NativeMethods.SECURITY_ATTRIBUTES
        {
            nLength = Marshal.SizeOf<NativeMethods.SECURITY_ATTRIBUTES>(),
            bInheritHandle = 1,
            lpSecurityDescriptor = IntPtr.Zero
        };

        // Create pipes
        if (!NativeMethods.CreatePipe(out var hPipeInRead, out var hPipeInWrite, ref sa, 0))
            throw new Win32Exception(Marshal.GetLastWin32Error(), "Failed to create input pipe");

        if (!NativeMethods.CreatePipe(out var hPipeOutRead, out var hPipeOutWrite, ref sa, 0))
        {
            hPipeInRead.Dispose();
            hPipeInWrite.Dispose();
            throw new Win32Exception(Marshal.GetLastWin32Error(), "Failed to create output pipe");
        }

        // Create PseudoConsole
        var coord = new NativeMethods.COORD((short)Math.Max(cols, 10), (short)Math.Max(rows, 5));
        int hr = NativeMethods.CreatePseudoConsole(coord, hPipeInRead, hPipeOutWrite, 0, out _hPC);
        if (hr != 0)
        {
            hPipeInRead.Dispose();
            hPipeInWrite.Dispose();
            hPipeOutRead.Dispose();
            hPipeOutWrite.Dispose();
            throw new Win32Exception(hr, "Failed to create PseudoConsole");
        }

        // Child process now has references via ConPTY, we can close our local handles for those ends
        hPipeInRead.Dispose();
        hPipeOutWrite.Dispose();

        _hPipeInWrite = hPipeInWrite;
        _hPipeOutRead = hPipeOutRead;

        InputStream = new FileStream(_hPipeInWrite, FileAccess.Write, 4096, false);
        OutputStream = new FileStream(_hPipeOutRead, FileAccess.Read, 4096, false);

        // Prepare attribute list
        var lpSize = IntPtr.Zero;
        NativeMethods.InitializeProcThreadAttributeList(IntPtr.Zero, 1, 0, ref lpSize);
        _lpAttributeList = Marshal.AllocHGlobal(lpSize);

        if (!NativeMethods.InitializeProcThreadAttributeList(_lpAttributeList, 1, 0, ref lpSize))
            throw new Win32Exception(Marshal.GetLastWin32Error(), "Failed to initialize attribute list");

        if (!NativeMethods.UpdateProcThreadAttribute(
            _lpAttributeList,
            0,
            (IntPtr)NativeMethods.PROC_THREAD_ATTRIBUTE_PSEUDOCONSOLE,
            _hPC,
            (IntPtr)IntPtr.Size,
            IntPtr.Zero,
            IntPtr.Zero))
        {
            throw new Win32Exception(Marshal.GetLastWin32Error(), "Failed to set ConPTY attribute");
        }

        // Create Process
        var sInfoEx = new NativeMethods.STARTUPINFOEX();
        sInfoEx.StartupInfo.cb = Marshal.SizeOf<NativeMethods.STARTUPINFOEX>();
        sInfoEx.lpAttributeList = _lpAttributeList;

        var pSec = new NativeMethods.SECURITY_ATTRIBUTES { nLength = Marshal.SizeOf<NativeMethods.SECURITY_ATTRIBUTES>() };
        var tSec = new NativeMethods.SECURITY_ATTRIBUTES { nLength = Marshal.SizeOf<NativeMethods.SECURITY_ATTRIBUTES>() };

        uint flags = NativeMethods.EXTENDED_STARTUPINFO_PRESENT;

        bool success = NativeMethods.CreateProcess(
            null,
            commandLine,
            ref pSec,
            ref tSec,
            false,
            flags,
            IntPtr.Zero,
            string.IsNullOrWhiteSpace(workingDir) ? null : workingDir,
            ref sInfoEx,
            out var pInfo);

        if (!success)
        {
            throw new Win32Exception(Marshal.GetLastWin32Error(), $"Failed to create process '{commandLine}'");
        }

        _hProcess = pInfo.hProcess;
        _hThread = pInfo.hThread;
        ProcessId = pInfo.dwProcessId;
    }

    public void Resize(int cols, int rows)
    {
        if (_hPC != IntPtr.Zero)
        {
            var coord = new NativeMethods.COORD((short)Math.Max(cols, 10), (short)Math.Max(rows, 5));
            NativeMethods.ResizePseudoConsole(_hPC, coord);
        }
    }

    public void Dispose()
    {
        if (_disposed) return;
        _disposed = true;

        try { InputStream?.Dispose(); } catch { }
        try { OutputStream?.Dispose(); } catch { }
        try { _hPipeInWrite?.Dispose(); } catch { }
        try { _hPipeOutRead?.Dispose(); } catch { }

        if (_hPC != IntPtr.Zero)
        {
            NativeMethods.ClosePseudoConsole(_hPC);
            _hPC = IntPtr.Zero;
        }

        if (_lpAttributeList != IntPtr.Zero)
        {
            NativeMethods.DeleteProcThreadAttributeList(_lpAttributeList);
            Marshal.FreeHGlobal(_lpAttributeList);
            _lpAttributeList = IntPtr.Zero;
        }

        if (_hThread != IntPtr.Zero)
        {
            NativeMethods.CloseHandle(_hThread);
            _hThread = IntPtr.Zero;
        }

        if (_hProcess != IntPtr.Zero)
        {
            NativeMethods.CloseHandle(_hProcess);
            _hProcess = IntPtr.Zero;
        }
    }
}
