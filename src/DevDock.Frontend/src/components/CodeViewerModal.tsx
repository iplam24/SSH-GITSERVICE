import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  X,
  Maximize2,
  Minimize2,
  Folder,
  FileCode,
  FileText,
  FileJson,
  File,
  Image as ImageIcon,
  Copy,
  Check,
  RefreshCw,
  Search,
  ChevronRight,
  ArrowUp,
  Laptop,
  Cloud,
  FileWarning,
  WrapText,
  Download,
} from 'lucide-react';
import { RepoFileNode, RepoFileContentResult } from '../types';
import { api } from '../services/api';

interface CodeViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'cloud' | 'local';
  title: string;
  // Cho Cloud mode
  cloudConfig?: {
    accountId: string;
    repoFullName: string;
    branch?: string;
  };
  // Cho Local mode
  localPath?: string;
  onShowToast?: (msg: string, type: 'success' | 'error' | 'info') => void;
}

export const CodeViewerModal: React.FC<CodeViewerModalProps> = ({
  isOpen,
  onClose,
  mode,
  title,
  cloudConfig,
  localPath,
  onShowToast,
}) => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [currentSubPath, setCurrentSubPath] = useState<string>('');
  const [fileList, setFileList] = useState<RepoFileNode[]>([]);
  const [loadingTree, setLoadingTree] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Selected file states
  const [selectedNode, setSelectedNode] = useState<RepoFileNode | null>(null);
  const [fileContent, setFileContent] = useState<RepoFileContentResult | null>(null);
  const [loadingFile, setLoadingFile] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [wordWrap, setWordWrap] = useState(false);

  // Cache folder tree
  const [treeCache, setTreeCache] = useState<Record<string, RepoFileNode[]>>({});

  // Reset state when opening modal
  useEffect(() => {
    if (isOpen) {
      setCurrentSubPath('');
      setSelectedNode(null);
      setFileContent(null);
      setSearchQuery('');
      setTreeCache({});
      loadDirectoryTree('');
    }
  }, [isOpen, mode, cloudConfig?.repoFullName, localPath]);

  // Load directory items
  const loadDirectoryTree = useCallback(
    async (path: string, force = false) => {
      if (!isOpen) return;
      const cacheKey = `${mode}:${path}`;
      if (!force && treeCache[cacheKey]) {
        setFileList(treeCache[cacheKey]);
        setCurrentSubPath(path);
        return;
      }

      setLoadingTree(true);
      try {
        let items: RepoFileNode[] = [];
        if (mode === 'cloud' && cloudConfig) {
          items = await api.getCloudRepoTree(
            cloudConfig.accountId,
            cloudConfig.repoFullName,
            path,
            cloudConfig.branch
          );
        } else if (mode === 'local' && localPath) {
          const targetPath = path ? `${localPath.replace(/[\\/]+$/, '')}\\${path.replace(/^[\\/]+/, '')}` : localPath;
          items = await api.getLocalFsTree(targetPath);
        }

        setFileList(items);
        setCurrentSubPath(path);
        setTreeCache((prev) => ({ ...prev, [cacheKey]: items }));
      } catch (err: any) {
        onShowToast?.(err.message || 'Không thể tải danh sách tệp', 'error');
      } finally {
        setLoadingTree(false);
      }
    },
    [isOpen, mode, cloudConfig, localPath, treeCache, onShowToast]
  );

  // Load file content
  const loadFile = async (node: RepoFileNode) => {
    if (node.isDirectory) return;
    setSelectedNode(node);
    setLoadingFile(true);
    setFileContent(null);
    setIsCopied(false);

    try {
      let res: RepoFileContentResult;
      if (mode === 'cloud' && cloudConfig) {
        res = await api.getCloudFileContent(
          cloudConfig.accountId,
          cloudConfig.repoFullName,
          node.path,
          cloudConfig.branch
        );
      } else {
        res = await api.getLocalFsFile(node.path);
      }
      setFileContent(res);
    } catch (err: any) {
      setFileContent({
        name: node.name,
        path: node.path,
        size: node.size || 0,
        isBinary: false,
        isImage: false,
        lineCount: 0,
        errorMessage: err.message || 'Lỗi khi đọc nội dung tệp',
      });
    } finally {
      setLoadingFile(false);
    }
  };

  // Navigate into folder
  const handleOpenFolder = (dirNode: RepoFileNode) => {
    let nextSubPath = '';
    if (mode === 'cloud') {
      nextSubPath = dirNode.path;
    } else {
      // Local: tính tương đối so với localPath
      if (localPath && dirNode.path.startsWith(localPath)) {
        nextSubPath = dirNode.path.slice(localPath.length).replace(/^[\\/]+/, '');
      } else {
        nextSubPath = dirNode.name;
      }
    }
    loadDirectoryTree(nextSubPath);
  };

  // Navigate up one level
  const handleGoUp = () => {
    if (!currentSubPath) return;
    const parts = currentSubPath.replace(/\\/g, '/').split('/').filter(Boolean);
    parts.pop();
    const parentPath = parts.join('/');
    loadDirectoryTree(parentPath);
  };

  // Format file size
  const formatSize = (bytes?: number | null) => {
    if (bytes === undefined || bytes === null) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Copy code to clipboard
  const handleCopyCode = () => {
    if (!fileContent?.content) return;
    navigator.clipboard.writeText(fileContent.content);
    setIsCopied(true);
    onShowToast?.('Đã sao chép mã nguồn vào bộ nhớ tạm!', 'success');
    setTimeout(() => setIsCopied(false), 2500);
  };

  // Download raw file
  const handleDownloadRaw = () => {
    if (!fileContent?.content && !fileContent?.dataUrl) return;
    const element = document.createElement('a');
    if (fileContent.dataUrl) {
      element.href = fileContent.dataUrl;
    } else {
      const file = new Blob([fileContent.content || ''], { type: 'text/plain;charset=utf-8' });
      element.href = URL.createObjectURL(file);
    }
    element.download = fileContent.name;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  // File type icon helper
  const getFileIcon = (node: RepoFileNode) => {
    if (node.isDirectory) {
      return <Folder className="w-4 h-4 text-amber-400 shrink-0" />;
    }
    const ext = (node.extension || '').toLowerCase();
    switch (ext) {
      case '.ts':
      case '.tsx':
        return <FileCode className="w-4 h-4 text-sky-400 shrink-0" />;
      case '.js':
      case '.jsx':
        return <FileCode className="w-4 h-4 text-amber-300 shrink-0" />;
      case '.cs':
        return <FileCode className="w-4 h-4 text-purple-400 shrink-0" />;
      case '.py':
        return <FileCode className="w-4 h-4 text-emerald-400 shrink-0" />;
      case '.json':
        return <FileJson className="w-4 h-4 text-amber-400 shrink-0" />;
      case '.html':
      case '.xml':
      case '.svg':
        return <FileCode className="w-4 h-4 text-orange-400 shrink-0" />;
      case '.css':
      case '.scss':
        return <FileCode className="w-4 h-4 text-blue-400 shrink-0" />;
      case '.md':
      case '.txt':
        return <FileText className="w-4 h-4 text-slate-300 shrink-0" />;
      case '.png':
      case '.jpg':
      case '.jpeg':
      case '.ico':
      case '.webp':
      case '.gif':
        return <ImageIcon className="w-4 h-4 text-pink-400 shrink-0" />;
      default:
        return <File className="w-4 h-4 text-slate-400 shrink-0" />;
    }
  };

  // Filtered files
  const filteredFiles = useMemo(() => {
    if (!searchQuery.trim()) return fileList;
    const q = searchQuery.toLowerCase().trim();
    return fileList.filter((f) => f.name.toLowerCase().includes(q));
  }, [fileList, searchQuery]);

  // Breadcrumb pieces
  const breadcrumbs = useMemo(() => {
    if (!currentSubPath) return [];
    return currentSubPath.replace(/\\/g, '/').split('/').filter(Boolean);
  }, [currentSubPath]);

  // Syntax highlighting coloring helper (token styling)
  const renderHighlightedCode = (text: string) => {
    const lines = text.split('\n');
    return lines.map((line, idx) => {
      return (
        <div key={idx} className="table-row hover:bg-white/[0.03] transition-colors leading-6">
          <span className="table-cell text-right pr-4 pl-2 select-none text-slate-600 font-mono text-[11px] w-12 shrink-0 border-r border-[#1a1f2c]">
            {idx + 1}
          </span>
          <span
            className={`table-cell pl-4 font-mono text-xs text-slate-200 ${
              wordWrap ? 'whitespace-pre-wrap break-all' : 'whitespace-pre'
            }`}
          >
            {line.length === 0 ? ' ' : line}
          </span>
        </div>
      );
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className={`bg-[#0d1017] border border-[#1e2332] rounded-xl shadow-2xl flex flex-col overflow-hidden transition-all duration-200 ${
          isFullscreen ? 'w-full h-full rounded-none' : 'w-[96vw] max-w-7xl h-[90vh]'
        }`}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#1b202e] bg-[#0b0e14] shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            {mode === 'cloud' ? (
              <div className="p-1.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
                <Cloud className="w-4 h-4" />
              </div>
            ) : (
              <div className="p-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                <Laptop className="w-4 h-4" />
              </div>
            )}
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-100 truncate">{title}</h3>
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-medium ${
                    mode === 'cloud'
                      ? 'bg-indigo-500/10 text-indigo-300 border border-indigo-500/30'
                      : 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/30'
                  }`}
                >
                  {mode === 'cloud' ? 'GitHub Remote' : 'Local Code'}
                </span>
                {mode === 'cloud' && cloudConfig?.branch && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-mono bg-white/[0.05] text-slate-400 border border-white/[0.08]">
                    {cloudConfig.branch}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-400 truncate">
                {mode === 'cloud'
                  ? `Duyệt cây thư mục và mã nguồn trực tiếp từ kho lưu trữ GitHub`
                  : localPath || 'Thư mục mã nguồn trên máy tính'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => loadDirectoryTree(currentSubPath, true)}
              disabled={loadingTree}
              className="p-1.5 rounded-lg hover:bg-white/[0.06] text-slate-400 hover:text-slate-200 transition-colors"
              title="Tải lại thư mục"
            >
              <RefreshCw className={`w-4 h-4 ${loadingTree ? 'animate-spin' : ''}`} />
            </button>

            <button
              type="button"
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="p-1.5 rounded-lg hover:bg-white/[0.06] text-slate-400 hover:text-slate-200 transition-colors"
              title={isFullscreen ? 'Thu nhỏ cửa sổ' : 'Phóng to toàn màn hình'}
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-red-500/10 text-slate-400 hover:text-red-400 transition-colors ml-1"
              title="Đóng trình xem code (Esc)"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Modal Main Body (2 Columns) */}
        <div className="flex-1 flex min-h-0 overflow-hidden bg-[#0d1017]">
          {/* Left Column: Explorer Tree Sidebar */}
          <div className="w-72 sm:w-80 md:w-96 border-r border-[#1b202e] flex flex-col min-h-0 bg-[#0b0e14]/60 shrink-0">
            {/* Search & Breadcrumbs */}
            <div className="p-2.5 border-b border-[#1a1f2c] flex flex-col gap-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Lọc tệp theo tên..."
                  className="w-full bg-[#12151f] border border-[#1e2332] rounded-md pl-8 pr-2.5 py-1 text-slate-200 text-xs placeholder-slate-500 focus:outline-none focus:border-sky-500"
                />
              </div>

              {/* Breadcrumb path navigation */}
              <div className="flex items-center gap-1 text-[11px] text-slate-400 overflow-x-auto whitespace-nowrap py-0.5 scrollbar-thin">
                <button
                  type="button"
                  onClick={() => loadDirectoryTree('')}
                  className={`hover:text-sky-400 transition-colors px-1 py-0.5 rounded ${
                    !currentSubPath ? 'text-sky-400 font-semibold' : 'text-slate-400'
                  }`}
                >
                  root
                </button>
                {breadcrumbs.map((crumb, idx) => {
                  const partialPath = breadcrumbs.slice(0, idx + 1).join('/');
                  const isLast = idx === breadcrumbs.length - 1;
                  return (
                    <React.Fragment key={partialPath}>
                      <ChevronRight className="w-3 h-3 text-slate-600 shrink-0" />
                      <button
                        type="button"
                        onClick={() => loadDirectoryTree(partialPath)}
                        className={`hover:text-sky-400 transition-colors px-1 py-0.5 rounded truncate max-w-[100px] ${
                          isLast ? 'text-sky-400 font-semibold' : 'text-slate-400'
                        }`}
                        title={crumb}
                      >
                        {crumb}
                      </button>
                    </React.Fragment>
                  );
                })}
              </div>
            </div>

            {/* Tree Items List */}
            <div className="flex-1 overflow-y-auto overflow-x-hidden p-1.5 space-y-0.5">
              {/* Back to parent button if inside subfolder */}
              {currentSubPath && (
                <button
                  type="button"
                  onClick={handleGoUp}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs text-slate-400 hover:text-slate-200 hover:bg-white/[0.05] transition-colors"
                >
                  <ArrowUp className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                  <span className="font-mono text-[11px]">.. (Lên thư mục cha)</span>
                </button>
              )}

              {loadingTree ? (
                <div className="py-12 text-center text-slate-500 text-xs flex flex-col items-center justify-center gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin text-slate-400" />
                  <span>Đang tải danh sách tệp...</span>
                </div>
              ) : filteredFiles.length === 0 ? (
                <div className="py-10 text-center text-slate-500 text-xs italic">
                  {searchQuery ? 'Không tìm thấy tệp nào phù hợp' : 'Thư mục trống'}
                </div>
              ) : (
                filteredFiles.map((node) => {
                  const isSelected = selectedNode?.path === node.path;
                  return (
                    <div
                      key={node.path}
                      onClick={() => {
                        if (node.isDirectory) {
                          handleOpenFolder(node);
                        } else {
                          loadFile(node);
                        }
                      }}
                      className={`group flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-md text-xs cursor-pointer transition-colors ${
                        isSelected
                          ? 'bg-sky-500/15 text-sky-200 font-medium border border-sky-500/30'
                          : 'text-slate-300 hover:bg-white/[0.05] hover:text-slate-100'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        {getFileIcon(node)}
                        <span className="truncate" title={node.name}>
                          {node.name}
                        </span>
                      </div>

                      <div className="flex items-center gap-1 text-[10px] text-slate-500 font-mono shrink-0">
                        {node.isDirectory ? (
                          <ChevronRight className="w-3 h-3 text-slate-600 group-hover:translate-x-0.5 transition-transform" />
                        ) : (
                          <span>{formatSize(node.size)}</span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Tree Footer stats */}
            <div className="p-2 border-t border-[#1a1f2c] bg-[#090b0f] text-[11px] text-slate-500 flex items-center justify-between px-3">
              <span>{fileList.filter((f) => f.isDirectory).length} thư mục</span>
              <span>{fileList.filter((f) => !f.isDirectory).length} tệp</span>
            </div>
          </div>

          {/* Right Column: Code Viewer Panel */}
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden bg-[#090b10]">
            {selectedNode ? (
              <>
                {/* File Header Bar */}
                <div className="flex items-center justify-between px-4 py-2 border-b border-[#1b202e] bg-[#0d1017] shrink-0">
                  <div className="flex items-center gap-2 min-w-0">
                    {getFileIcon(selectedNode)}
                    <span className="text-xs font-semibold text-slate-100 truncate">{selectedNode.name}</span>
                    <span className="text-[11px] text-slate-500 font-mono truncate hidden sm:inline">
                      ({selectedNode.path})
                    </span>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {fileContent && !fileContent.isImage && !fileContent.isBinary && (
                      <>
                        <span className="text-[11px] font-mono text-slate-400 px-2 py-0.5 rounded bg-white/[0.04]">
                          {fileContent.lineCount} dòng
                        </span>
                        <span className="text-[11px] font-mono text-slate-400 px-2 py-0.5 rounded bg-white/[0.04]">
                          {formatSize(fileContent.size)}
                        </span>

                        <button
                          type="button"
                          onClick={() => setWordWrap(!wordWrap)}
                          className={`p-1.5 rounded hover:bg-white/[0.06] transition-colors text-xs flex items-center gap-1 ${
                            wordWrap ? 'text-sky-400 bg-sky-500/10' : 'text-slate-400'
                          }`}
                          title="Bật/Tắt ngắt dòng (Word wrap)"
                        >
                          <WrapText className="w-3.5 h-3.5" />
                        </button>

                        <button
                          type="button"
                          onClick={handleCopyCode}
                          className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#161a26] hover:bg-[#1d2232] text-slate-200 border border-[#212738] text-[11px] font-medium transition-colors shadow-sm"
                          title="Sao chép toàn bộ mã nguồn"
                        >
                          {isCopied ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                              <span className="text-emerald-400">Đã chép</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5 text-slate-400" />
                              <span>Sao chép</span>
                            </>
                          )}
                        </button>
                      </>
                    )}

                    <button
                      type="button"
                      onClick={handleDownloadRaw}
                      className="p-1.5 rounded hover:bg-white/[0.06] text-slate-400 hover:text-slate-200 transition-colors"
                      title="Tải tệp này về máy"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* File Content Body */}
                <div className="flex-1 overflow-auto p-2 min-h-0 bg-[#0b0d13]">
                  {loadingFile ? (
                    <div className="h-full flex flex-col items-center justify-center gap-2 text-slate-500 text-xs">
                      <RefreshCw className="w-5 h-5 animate-spin text-sky-400" />
                      <span>Đang nạp mã nguồn...</span>
                    </div>
                  ) : fileContent?.errorMessage ? (
                    <div className="h-full flex flex-col items-center justify-center gap-2 text-amber-400 text-xs p-6 text-center max-w-md mx-auto">
                      <FileWarning className="w-10 h-10 text-amber-500/80 mb-1" />
                      <span className="font-semibold text-slate-200">{fileContent.name}</span>
                      <p className="text-slate-400">{fileContent.errorMessage}</p>
                    </div>
                  ) : fileContent?.isImage ? (
                    <div className="h-full flex flex-col items-center justify-center p-6 gap-3">
                      <div className="p-3 bg-black/40 rounded-xl border border-white/[0.08] max-w-xl max-h-[80%] flex items-center justify-center overflow-hidden shadow-2xl">
                        <img
                          src={fileContent.dataUrl || ''}
                          alt={fileContent.name}
                          className="max-h-[60vh] max-w-full object-contain rounded"
                        />
                      </div>
                      <span className="text-xs font-mono text-slate-400">
                        {fileContent.name} ({formatSize(fileContent.size)})
                      </span>
                    </div>
                  ) : fileContent?.isBinary ? (
                    <div className="h-full flex flex-col items-center justify-center gap-2 text-slate-500 text-xs">
                      <FileWarning className="w-8 h-8 text-slate-600" />
                      <span>Tệp nhị phân không hỗ trợ xem văn bản trực tiếp.</span>
                    </div>
                  ) : (
                    <div className="table w-full select-text py-2">
                      {renderHighlightedCode(fileContent?.content || '')}
                    </div>
                  )}
                </div>
              </>
            ) : (
              /* Empty state: No file selected */
              <div className="flex-1 flex flex-col items-center justify-center gap-3 text-slate-500 text-xs p-6 text-center">
                <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.05]">
                  <FileCode className="w-10 h-10 text-slate-600 stroke-1" />
                </div>
                <span className="font-medium text-slate-300">Chưa chọn tệp mã nguồn</span>
                <p className="text-slate-500 max-w-xs">
                  Nhấp vào một tệp bất kỳ trong danh sách bên trái để mở và đọc trực tiếp mã nguồn.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
