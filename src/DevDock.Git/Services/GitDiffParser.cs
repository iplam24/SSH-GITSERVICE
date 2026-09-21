using System.Text.RegularExpressions;
using DevDock.Core.Models;

namespace DevDock.Git.Services;

public static class GitDiffParser
{
    private static readonly Regex HunkHeaderRegex = new(
        @"^@@\s+-(\d+)(?:,(\d+))?\s+\+(\d+)(?:,(\d+))?\s+@@(.*)$",
        RegexOptions.Compiled);

    public static GitDiffResult Parse(string rawDiff, string filePath, string? oldPath = null)
    {
        var result = new GitDiffResult
        {
            FilePath = filePath,
            OldFilePath = oldPath ?? filePath,
            RawDiff = rawDiff
        };

        if (string.IsNullOrWhiteSpace(rawDiff))
        {
            return result;
        }

        if (rawDiff.Contains("Binary files") || rawDiff.Contains("GIT binary patch"))
        {
            result.IsBinary = true;
            return result;
        }

        var lines = rawDiff.Split('\n');
        DiffHunk? currentHunk = null;
        int oldLine = 0;
        int newLine = 0;

        foreach (var rawLine in lines)
        {
            var line = rawLine.TrimEnd('\r');

            var match = HunkHeaderRegex.Match(line);
            if (match.Success)
            {
                oldLine = int.Parse(match.Groups[1].Value);
                int oldLines = match.Groups[2].Success ? int.Parse(match.Groups[2].Value) : 1;
                newLine = int.Parse(match.Groups[3].Value);
                int newLines = match.Groups[4].Success ? int.Parse(match.Groups[4].Value) : 1;

                currentHunk = new DiffHunk
                {
                    Header = line,
                    OldStart = oldLine,
                    OldLines = oldLines,
                    NewStart = newLine,
                    NewLines = newLines
                };
                result.Hunks.Add(currentHunk);
                continue;
            }

            if (currentHunk == null)
            {
                continue; // Skip file headers before first hunk
            }

            if (line.StartsWith("+") && !line.StartsWith("+++"))
            {
                currentHunk.Lines.Add(new DiffLine
                {
                    Type = DiffLineType.Added,
                    NewLineNumber = newLine++,
                    Content = line.Substring(1)
                });
            }
            else if (line.StartsWith("-") && !line.StartsWith("---"))
            {
                currentHunk.Lines.Add(new DiffLine
                {
                    Type = DiffLineType.Deleted,
                    OldLineNumber = oldLine++,
                    Content = line.Substring(1)
                });
            }
            else if (line.StartsWith(" "))
            {
                currentHunk.Lines.Add(new DiffLine
                {
                    Type = DiffLineType.Context,
                    OldLineNumber = oldLine++,
                    NewLineNumber = newLine++,
                    Content = line.Substring(1)
                });
            }
            else if (line.StartsWith("\\ No newline at end of file"))
            {
                // ignore or note
            }
        }

        return result;
    }

    public static GitDiffResult CreateSyntheticAddedDiff(string content, string filePath)
    {
        var result = new GitDiffResult
        {
            FilePath = filePath,
            RawDiff = content
        };

        var lines = content.Split('\n');
        var hunk = new DiffHunk
        {
            Header = $"@@ -0,0 +1,{lines.Length} @@",
            OldStart = 0,
            OldLines = 0,
            NewStart = 1,
            NewLines = lines.Length
        };

        for (int i = 0; i < lines.Length; i++)
        {
            hunk.Lines.Add(new DiffLine
            {
                Type = DiffLineType.Added,
                NewLineNumber = i + 1,
                Content = lines[i].TrimEnd('\r')
            });
        }

        result.Hunks.Add(hunk);
        return result;
    }
}
