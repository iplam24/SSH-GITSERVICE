import React, { useState, useEffect, useRef } from 'react';
import {
  Terminal as TerminalIcon,
  Sparkles,
  Send,
  Trash2,
  Copy,
  Check,
  Play,
  Settings,
  Code2,
  Bug,
  GitCommit,
  Zap,
  Plus,
  Search,
  FolderGit2,
  FileCode,
  CheckSquare,
  Square,
  Clock,
  ChevronRight,
  ChevronDown,
  Layers,
  Box,
  PanelLeftClose,
  PanelLeftOpen,
  HelpCircle,
  ExternalLink,
  ShieldCheck,
  RefreshCw,
  Cpu,
  Folder,
  FolderOpen,
  FolderPlus,
  MessageSquare,
  CornerDownLeft,
  X,
  Edit2,
  CheckCheck,
} from 'lucide-react';
import { Terminal as XTerm } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import {
  AiProviderConfig,
  AiChatMessage,
  ProjectItem,
  AiSession,
  AiExecutionPlan,
  AiPlanStep,
  ProjectTemplate,
  AiWorkspaceProject,
} from '../types';
import { api } from '../services/api';

interface AiPageProps {
  providers: AiProviderConfig[];
  activeProvider: AiProviderConfig | null;
  projects?: ProjectItem[];
  onRefreshProjects?: () => void;
  onRefreshProviders: () => void;
  onSelectProvider: (p: AiProviderConfig) => void;
  onNavigateSettings: () => void;
  onOpenTerminal?: (path: string) => void;
  onRunCommandInTerminal?: (cmd: string) => void;
  onShowToast: (msg: string, type: 'success' | 'error' | 'info') => void;
}

const STORAGE_KEY_WORKSPACES = 'devdock_ai_workspaces_v3';

const PROJECT_TEMPLATES: ProjectTemplate[] = [
  {
    id: 'react-vite',
    name: 'React 18 + Vite + Tailwind',
    category: 'Frontend',
    description: 'Ứng dụng Web Single Page hiện đại với TypeScript, Vite build siêu tốc và Tailwind CSS.',
    icon: '⚡',
    defaultDirName: 'my-react-app',
    commands: {
      scaffold: 'npm create vite@latest my-react-app -- --template react-ts',
      dev: 'npm run dev',
      build: 'npm run build',
    },
  },
  {
    id: 'nextjs',
    name: 'Next.js 15 Fullstack (App Router)',
    category: 'Fullstack',
    description: 'Khung ứng dụng React Fullstack với Server Components, API routes và tối ưu hóa SEO.',
    icon: '▲',
    defaultDirName: 'my-next-app',
    commands: {
      scaffold: 'npx create-next-app@latest my-next-app --ts --tailwind --eslint --app --no-src-dir',
      dev: 'npm run dev',
      build: 'npm run build',
    },
  },
  {
    id: 'dotnet-api',
    name: 'ASP.NET Core 9 Web API',
    category: 'Backend',
    description: 'Dịch vụ RESTful API hiệu năng cao với C# 13, .NET 9, Swagger OpenAPI và kiến trúc Clean Architecture.',
    icon: '🔷',
    defaultDirName: 'MyBackendApi',
    commands: {
      scaffold: 'dotnet new webapi -n MyBackendApi -controllers',
      dev: 'dotnet watch run',
      build: 'dotnet build',
      test: 'dotnet test',
    },
  },
  {
    id: 'nodejs-express',
    name: 'Node.js Express + TypeScript',
    category: 'Backend',
    description: 'Máy chủ RESTful API Node.js tinh gọn với TypeScript, nodemon và CORS.',
    icon: '🟢',
    defaultDirName: 'express-ts-api',
    commands: {
      scaffold: 'npx express-generator-typescript express-ts-api',
      dev: 'npm run dev',
      build: 'npm run build',
    },
  },
  {
    id: 'fastapi-python',
    name: 'FastAPI Python 3.12',
    category: 'Backend / AI',
    description: 'Khung ứng dụng Python tốc độ cao cho AI backend, Pydantic validation và tài liệu Swagger tự động.',
    icon: '🐍',
    defaultDirName: 'my-fastapi-app',
    commands: {
      scaffold: 'mkdir my-fastapi-app && cd my-fastapi-app && python -m venv .venv',
      dev: 'uvicorn main:app --reload',
      build: 'pip freeze > requirements.txt',
    },
  },
  {
    id: 'golang-gin',
    name: 'Go Gin Microservice',
    category: 'Microservices',
    description: 'Dịch vụ vi mô Golang siêu nhẹ và nhanh với Gin Framework.',
    icon: '🔵',
    defaultDirName: 'gin-microservice',
    commands: {
      scaffold: 'mkdir gin-microservice && cd gin-microservice && go mod init gin-microservice',
      dev: 'go run main.go',
      build: 'go build -o app.exe main.go',
    },
  },
];

export const AiPage: React.FC<AiPageProps> = ({
  providers,
  activeProvider,
  projects = [],
  onRefreshProjects,
  onRefreshProviders,
  onSelectProvider,
  onNavigateSettings,
  onOpenTerminal,
  onRunCommandInTerminal,
  onShowToast,
}) => {
  // Main view mode: 'planner' (Workspace Agent + Sub-conversations) or 'cli' (DevDock Custom AI CLI)
  const [viewMode, setViewMode] = useState<'planner' | 'cli'>('planner');

  // ==================== WORKSPACE PROJECTS & SUB-CONVERSATIONS ====================
  const [workspaces, setWorkspaces] = useState<AiWorkspaceProject[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_WORKSPACES);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch { }

    // Default starter workspace (bound to ToolTienich or first detected project)
    const initialPath = projects[0]?.path || 'D:\\ToolTienich';
    const initialName = projects[0]?.name || 'ToolTienich Workspace';

    return [
      {
        id: 'ws-default',
        name: initialName,
        folderPath: initialPath,
        createdAt: new Date().toLocaleDateString('vi-VN'),
        conversations: [
          {
            id: 'conv-init-1',
            title: 'Kế hoạch phát triển & Kiến trúc',
            createdAt: new Date().toLocaleDateString('vi-VN'),
            updatedAt: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
            category: 'plan',
            messages: [
              {
                role: 'assistant',
                content: `Xin chào! Tôi là Trợ lý Lập trình viên DevDock AI Workstation.\n\nKhông gian làm việc hiện tại: **${initialName}**\nĐường dẫn thư mục: \`${initialPath}\`\n\nTôi có thể hỗ trợ bạn:\n1. **Lập Kế Hoạch Thực Thi (Execution Plan)** theo từng bước có thể duyệt và kiểm soát.\n2. **Tạo nhiều cuộc trò chuyện con (Sub-conversations)** cho từng tác vụ riêng biệt giống Antigravity.\n3. **Sử dụng DevDock AI CLI Agent**: Thử nghiệm với các lệnh slash \`/plan\`, \`/scaffold\`, \`/commit\`, \`/git\` ngay trong terminal.\n\nBạn muốn thực hiện tác vụ gì cho dự án này?`,
                timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
              },
            ],
          },
        ],
        activeConversationId: 'conv-init-1',
      },
    ];
  });

  const [activeWorkspaceId, setActiveWorkspaceId] = useState<string>(() => {
    return workspaces[0]?.id || 'ws-default';
  });

  const [expandedWorkspaces, setExpandedWorkspaces] = useState<Record<string, boolean>>({
    'ws-default': true,
  });

  // Active Workspace & Conversation
  const activeWorkspace = workspaces.find((w) => w.id === activeWorkspaceId) || workspaces[0];
  const activeConversation =
    activeWorkspace?.conversations.find((c) => c.id === activeWorkspace?.activeConversationId) ||
    activeWorkspace?.conversations[0];

  const [workspaceSearch, setWorkspaceSearch] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // New Workspace Modal State
  const [isAddWorkspaceOpen, setIsAddWorkspaceOpen] = useState(false);
  const [newWsName, setNewWsName] = useState('');
  const [newWsPath, setNewWsPath] = useState('');

  // Active chat state
  const [inputPrompt, setInputPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const STORAGE_KEY_AI_MODELS = 'devdock_ai_selected_models_v1';
  const [selectedModel, setSelectedModel] = useState<string>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_AI_MODELS);
      if (saved) {
        const map = JSON.parse(saved);
        if (activeProvider?.id && map[activeProvider.id]) {
          return map[activeProvider.id];
        }
      }
    } catch { }
    return activeProvider?.defaultModel || '';
  });

  const handleUpdateSelectedModel = (m: string) => {
    setSelectedModel(m);
    if (activeProvider?.id) {
      try {
        const saved = localStorage.getItem(STORAGE_KEY_AI_MODELS);
        const map = saved ? JSON.parse(saved) : {};
        map[activeProvider.id] = m;
        localStorage.setItem(STORAGE_KEY_AI_MODELS, JSON.stringify(map));
      } catch { }
    }
  };

  // Scaffolder drawer
  const [isScaffoldOpen, setIsScaffoldOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<ProjectTemplate | null>(null);
  const [projectNameInput, setProjectNameInput] = useState('');
  const [targetDirInput, setTargetDirInput] = useState('D:\\Projects');

  // Command History Navigation
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Save workspaces to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_WORKSPACES, JSON.stringify(workspaces));
    } catch { }
  }, [workspaces]);

  useEffect(() => {
    if (activeProvider) {
      try {
        const saved = localStorage.getItem(STORAGE_KEY_AI_MODELS);
        if (saved) {
          const map = JSON.parse(saved);
          if (map[activeProvider.id]) {
            setSelectedModel(map[activeProvider.id]);
            return;
          }
        }
      } catch { }
      setSelectedModel(activeProvider.defaultModel);
    }
  }, [activeProvider?.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeConversation?.messages, isLoading]);

  // Toggle workspace accordion
  const toggleWorkspaceExpand = (wsId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedWorkspaces((prev) => ({ ...prev, [wsId]: !prev[wsId] }));
  };

  // Add new workspace project
  const handleCreateWorkspace = () => {
    if (!newWsName.trim() || !newWsPath.trim()) {
      onShowToast('Vui lòng điền tên dự án và đường dẫn thư mục', 'error');
      return;
    }

    const newWsId = `ws-${Date.now()}`;
    const initialConvId = `conv-${Date.now()}`;
    const newWs: AiWorkspaceProject = {
      id: newWsId,
      name: newWsName.trim(),
      folderPath: newWsPath.trim(),
      createdAt: new Date().toLocaleDateString('vi-VN'),
      conversations: [
        {
          id: initialConvId,
          title: 'Khởi tạo không gian làm việc',
          createdAt: new Date().toLocaleDateString('vi-VN'),
          updatedAt: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
          category: 'general',
          messages: [
            {
              role: 'assistant',
              content: `Dự án **${newWsName.trim()}** đã được thiết lập!\nĐường dẫn thư mục: \`${newWsPath.trim()}\`\n\nTôi đã sẵn sàng hỗ trợ mã nguồn, lập kế hoạch hoặc sinh mã cho dự án này.`,
              timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
            },
          ],
        },
      ],
      activeConversationId: initialConvId,
    };

    setWorkspaces((prev) => [newWs, ...prev]);
    setActiveWorkspaceId(newWsId);
    setExpandedWorkspaces((prev) => ({ ...prev, [newWsId]: true }));
    setIsAddWorkspaceOpen(false);
    setNewWsName('');
    setNewWsPath('');
    onShowToast(`Đã thêm không gian làm việc: ${newWs.name}`, 'success');
  };

  // Delete workspace
  const handleDeleteWorkspace = (wsId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (workspaces.length <= 1) {
      onShowToast('Cần giữ lại ít nhất 1 không gian làm việc', 'info');
      return;
    }

    setWorkspaces((prev) => {
      const filtered = prev.filter((w) => w.id !== wsId);
      if (activeWorkspaceId === wsId && filtered.length > 0) {
        setActiveWorkspaceId(filtered[0].id);
      }
      return filtered;
    });
    onShowToast('Đã xóa không gian làm việc', 'info');
  };

  // Add sub-conversation to workspace
  const handleCreateSubConversation = (
    wsId: string,
    category: AiSession['category'] = 'general',
    e?: React.MouseEvent
  ) => {
    if (e) e.stopPropagation();

    const newConvId = `conv-${Date.now()}`;
    const targetWs = workspaces.find((w) => w.id === wsId);
    const count = (targetWs?.conversations.length || 0) + 1;

    const newConv: AiSession = {
      id: newConvId,
      title: `Hội thoại mới #${count}`,
      createdAt: new Date().toLocaleDateString('vi-VN'),
      updatedAt: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
      category,
      messages: [
        {
          role: 'assistant',
          content: `Đoạn hội thoại mới cho dự án **${targetWs?.name || 'DevDock'}** đã bắt đầu. Bạn cần lập kế hoạch hoặc xử lý vấn đề gì?`,
          timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
        },
      ],
    };

    setWorkspaces((prev) =>
      prev.map((w) => {
        if (w.id !== wsId) return w;
        return {
          ...w,
          conversations: [newConv, ...w.conversations],
          activeConversationId: newConvId,
        };
      })
    );

    setActiveWorkspaceId(wsId);
    setExpandedWorkspaces((prev) => ({ ...prev, [wsId]: true }));
    setViewMode('planner');
    onShowToast('Đã tạo đoạn hội thoại mới!', 'success');
  };

  // Delete sub-conversation
  const handleDeleteSubConversation = (wsId: string, convId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const ws = workspaces.find((w) => w.id === wsId);
    if (!ws) return;

    if (ws.conversations.length <= 1) {
      onShowToast('Mỗi dự án cần ít nhất 1 đoạn hội thoại', 'info');
      return;
    }

    setWorkspaces((prev) =>
      prev.map((w) => {
        if (w.id !== wsId) return w;
        const filtered = w.conversations.filter((c) => c.id !== convId);
        const newActiveId = w.activeConversationId === convId ? filtered[0]?.id : w.activeConversationId;
        return {
          ...w,
          conversations: filtered,
          activeConversationId: newActiveId,
        };
      })
    );
    onShowToast('Đã xóa đoạn hội thoại', 'info');
  };

  // Select sub-conversation
  const handleSelectConversation = (wsId: string, convId: string) => {
    setActiveWorkspaceId(wsId);
    setWorkspaces((prev) =>
      prev.map((w) => (w.id === wsId ? { ...w, activeConversationId: convId } : w))
    );
    setViewMode('planner');
  };

  // Chat message sending in Planner mode
  const handleSendPrompt = async (customPrompt?: string) => {
    const rawText = (customPrompt ?? inputPrompt).trim();
    if (!rawText || isLoading || !activeConversation) return;

    if (!activeProvider) {
      onShowToast('Chưa có nhà cung cấp AI nào được kích hoạt. Hãy cấu hình trong Cài đặt!', 'error');
      return;
    }

    setCommandHistory((prev) => [rawText, ...prev.filter((p) => p !== rawText)]);
    setHistoryIndex(-1);

    const userMessage: AiChatMessage = {
      role: 'user',
      content: rawText,
      timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
    };

    const updatedMessages = [...activeConversation.messages, userMessage];

    // Update active conversation with user message
    setWorkspaces((prev) =>
      prev.map((w) => {
        if (w.id !== activeWorkspaceId) return w;
        return {
          ...w,
          conversations: w.conversations.map((c) => {
            if (c.id !== activeConversation.id) return c;
            const title = c.messages.length <= 1 ? rawText.slice(0, 32) + '...' : c.title;
            return {
              ...c,
              title,
              updatedAt: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
              messages: updatedMessages,
            };
          }),
        };
      })
    );

    setInputPrompt('');
    setIsLoading(true);

    // Build context-aware system prompt with project folder awareness
    const systemPrompt = `Bạn là DevDock AI Senior Software Architect & CLI Agent trong môi trường máy trạm Windows 11.
Trả lời bằng tiếng Việt tự nhiên, chuyên nghiệp, chính xác và có chiều sâu.
Ngữ cảnh Không gian làm việc hiện tại:
- Tên dự án: ${activeWorkspace.name}
- Thư mục gốc trên đĩa: ${activeWorkspace.folderPath}

Quy ước trả lời:
1. Nêu giải pháp và kiến trúc rõ ràng, thực tế.
2. Khi đưa ra câu lệnh dòng lệnh (PowerShell, bash, git, npm, dotnet), luôn bọc trong block \`\`\`powershell hoặc \`\`\`bash để người dùng có thể bấm chạy trực tiếp.
3. Nếu người dùng yêu cầu lập kế hoạch (plan), hãy định dạng rõ ràng các bước thực hiện [Bước 1: ...], [Bước 2: ...] kèm câu lệnh tương ứng.`;

    try {
      const res = await api.sendAiChat({
        providerId: activeProvider.id,
        model: selectedModel || activeProvider.defaultModel,
        messages: updatedMessages.map((m) => ({ role: m.role, content: m.content })),
        systemPrompt,
        temperature: 0.3,
      });

      if (res.success) {
        const assistantMessage: AiChatMessage = {
          role: 'assistant',
          content: res.message,
          timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
        };

        setWorkspaces((prev) =>
          prev.map((w) => {
            if (w.id !== activeWorkspaceId) return w;
            return {
              ...w,
              conversations: w.conversations.map((c) => {
                if (c.id !== activeConversation.id) return c;
                return {
                  ...c,
                  messages: [...c.messages, assistantMessage],
                };
              }),
            };
          })
        );
      } else {
        const errorMessage: AiChatMessage = {
          role: 'assistant',
          content: `⚠️ [Lỗi phản hồi từ ${activeProvider.name}]: ${res.errorMessage || 'Không thể tạo câu trả lời.'}`,
          timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
        };

        setWorkspaces((prev) =>
          prev.map((w) => {
            if (w.id !== activeWorkspaceId) return w;
            return {
              ...w,
              conversations: w.conversations.map((c) => {
                if (c.id !== activeConversation.id) return c;
                return { ...c, messages: [...c.messages, errorMessage] };
              }),
            };
          })
        );
        onShowToast(res.errorMessage || 'Lỗi xử lý phản hồi AI', 'error');
      }
    } catch (err: any) {
      const networkErrorMessage: AiChatMessage = {
        role: 'assistant',
        content: `⚠️ [Lỗi kết nối]: ${err.message || 'Không thể kết nối đến máy chủ AI.'}`,
        timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
      };

      setWorkspaces((prev) =>
        prev.map((w) => {
          if (w.id !== activeWorkspaceId) return w;
          return {
            ...w,
            conversations: w.conversations.map((c) => {
              if (c.id !== activeConversation.id) return c;
              return { ...c, messages: [...c.messages, networkErrorMessage] };
            }),
          };
        })
      );
      onShowToast(err.message || 'Lỗi mạng hoặc API Key', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendPrompt();
      return;
    }

    if (e.key === 'ArrowUp' && inputPrompt === '') {
      e.preventDefault();
      if (commandHistory.length > 0) {
        const nextIdx = Math.min(historyIndex + 1, commandHistory.length - 1);
        setHistoryIndex(nextIdx);
        setInputPrompt(commandHistory[nextIdx]);
      }
    }

    if (e.key === 'ArrowDown' && historyIndex >= 0) {
      e.preventDefault();
      const prevIdx = historyIndex - 1;
      if (prevIdx < 0) {
        setHistoryIndex(-1);
        setInputPrompt('');
      } else {
        setHistoryIndex(prevIdx);
        setInputPrompt(commandHistory[prevIdx]);
      }
    }
  };

  const handleCopyCode = (code: string, key: string) => {
    navigator.clipboard.writeText(code);
    setCopiedKey(key);
    onShowToast('Đã sao chép vào bộ nhớ tạm!', 'success');
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleRunInTerminal = (cmd: string) => {
    if (onRunCommandInTerminal) {
      onRunCommandInTerminal(cmd);
      onShowToast(`Đang chuyển lệnh vào Terminal: ${cmd.slice(0, 45)}...`, 'info');
    }
  };

  // Plan Step Actions
  const handleTogglePlanStep = (stepId: string) => {
    if (!activeConversation?.plan) return;
    setWorkspaces((prev) =>
      prev.map((w) => {
        if (w.id !== activeWorkspaceId) return w;
        return {
          ...w,
          conversations: w.conversations.map((c) => {
            if (c.id !== activeConversation.id || !c.plan) return c;
            const newSteps = c.plan.steps.map((st) => {
              if (st.id !== stepId) return st;
              return {
                ...st,
                status: st.status === 'done' ? ('pending' as const) : ('done' as const),
              };
            });
            return { ...c, plan: { ...c.plan, steps: newSteps } };
          }),
        };
      })
    );
  };

  const handleExecutePlanInTerminal = async () => {
    if (!activeConversation?.plan) return;
    const commandsToRun = activeConversation.plan.steps
      .filter((st) => st.command)
      .map((st) => st.command!)
      .join(' && ');

    if (!commandsToRun) {
      onShowToast('Kế hoạch không chứa câu lệnh dòng lệnh nào.', 'info');
      return;
    }

    if (onRunCommandInTerminal) {
      onRunCommandInTerminal(commandsToRun);
      onShowToast('Đang chuyển toàn bộ kế hoạch vào Terminal...', 'info');

      setWorkspaces((prev) =>
        prev.map((w) => {
          if (w.id !== activeWorkspaceId) return w;
          return {
            ...w,
            conversations: w.conversations.map((c) => {
              if (c.id !== activeConversation.id || !c.plan) return c;
              return {
                ...c,
                plan: {
                  ...c.plan,
                  status: 'running',
                  steps: c.plan.steps.map((st) => ({ ...st, status: 'done' })),
                },
              };
            }),
          };
        })
      );
    }
  };

  const handleApplyScaffoldingPlan = () => {
    if (!selectedTemplate || !projectNameInput.trim()) {
      onShowToast('Vui lòng nhập tên dự án', 'error');
      return;
    }

    const fullPath = `${targetDirInput.replace(/[\\/]$/, '')}\\${projectNameInput.trim()}`;
    const scaffoldCmd = selectedTemplate.commands.scaffold.replace(
      selectedTemplate.defaultDirName,
      projectNameInput.trim()
    );

    const plan: AiExecutionPlan = {
      id: `plan-${Date.now()}`,
      title: `Khởi tạo Dự Án: ${selectedTemplate.name}`,
      description: `Tạo dự án mới tại ${fullPath} sử dụng template ${selectedTemplate.name}`,
      targetDirectory: fullPath,
      status: 'draft',
      createdAt: new Date().toLocaleTimeString('vi-VN'),
      steps: [
        {
          id: 'step-1',
          title: `Tạo thư mục dự án và chạy scaffold`,
          description: `Khởi tạo mã nguồn ban đầu từ template`,
          command: `mkdir "${fullPath}"; cd "${fullPath}"; ${scaffoldCmd}`,
          status: 'pending',
          targetFiles: ['package.json', 'README.md', '.gitignore'],
        },
        {
          id: 'step-2',
          title: `Cài đặt thư viện dependencies`,
          description: `Chạy tiến trình cài đặt packages`,
          command: `cd "${fullPath}"; npm install`,
          status: 'pending',
        },
        {
          id: 'step-3',
          title: `Đăng ký dự án vào DevDock Workstation`,
          description: `Tự động thêm vào danh mục Quản lý Dự án`,
          status: 'pending',
        },
        {
          id: 'step-4',
          title: `Khởi chạy máy chủ phát triển (Dev Server)`,
          description: `Khởi chạy: ${selectedTemplate.commands.dev}`,
          command: `cd "${fullPath}"; ${selectedTemplate.commands.dev}`,
          status: 'pending',
        },
      ],
    };

    setWorkspaces((prev) =>
      prev.map((w) => {
        if (w.id !== activeWorkspaceId) return w;
        return {
          ...w,
          conversations: w.conversations.map((c) => {
            if (c.id !== activeConversation?.id) return c;
            return {
              ...c,
              title: `Tạo ${selectedTemplate.name}: ${projectNameInput}`,
              category: 'scaffold',
              updatedAt: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
              plan,
              messages: [
                ...c.messages,
                {
                  role: 'user',
                  content: `Yêu cầu khởi tạo dự án mới: **${selectedTemplate.name}**\n- Tên dự án: \`${projectNameInput}\`\n- Thư mục đích: \`${fullPath}\``,
                  timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
                },
                {
                  role: 'assistant',
                  content: `Tôi đã lập xong **Kế Hoạch Thực Thi (Execution Plan)** gồm 4 bước để khởi tạo dự án **${selectedTemplate.name}**. Bạn có thể xem checklist bên trên và bấm nút **⚡ Thực thi Kế hoạch** để chạy trực tiếp vào Terminal!`,
                  timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
                },
              ],
            };
          }),
        };
      })
    );

    setIsScaffoldOpen(false);
    onShowToast(`Đã lập kế hoạch khởi tạo ${selectedTemplate.name}!`, 'success');
  };

  // Render message body with styled codeblocks
  // Helper to parse inline markdown: **bold**, `code`, *italic*
  const renderInlineMarkdown = (text: string) => {
    const tokens = text.split(/(\*\*.*?\*\*|`[^`]+`)/g);
    return tokens.map((token, idx) => {
      if (token.startsWith('**') && token.endsWith('**')) {
        return (
          <strong key={idx} className="font-bold text-slate-100">
            {token.slice(2, -2)}
          </strong>
        );
      }
      if (token.startsWith('`') && token.endsWith('`')) {
        return (
          <code
            key={idx}
            className="px-1.5 py-0.5 mx-0.5 rounded bg-[#162032] text-cyan-300 font-mono text-[11px] border border-cyan-500/20"
          >
            {token.slice(1, -1)}
          </code>
        );
      }
      return token;
    });
  };

  // Helper to render Markdown text blocks (headings, bullet lists, divider, paragraphs)
  const renderMarkdownBlock = (rawText: string, blockKey: string) => {
    const lines = rawText.split('\n');
    const elements: React.ReactNode[] = [];

    lines.forEach((line, lineIdx) => {
      const trimmed = line.trim();
      const key = `${blockKey}-l-${lineIdx}`;

      // Horizontal dividers (---, ***, ___)
      if (trimmed === '---' || trimmed === '***' || trimmed === '___') {
        elements.push(<div key={key} className="my-3 border-t border-[#1E2A44]" />);
        return;
      }

      // Headings
      if (trimmed.startsWith('# ')) {
        elements.push(
          <h1 key={key} className="text-base font-bold text-emerald-300 mt-3 mb-1.5 flex items-center gap-1.5">
            <span className="w-1.5 h-4 rounded-sm bg-emerald-400 inline-block" />
            <span>{renderInlineMarkdown(trimmed.slice(2))}</span>
          </h1>
        );
        return;
      }
      if (trimmed.startsWith('## ')) {
        elements.push(
          <h2 key={key} className="text-sm font-bold text-cyan-300 mt-2.5 mb-1 flex items-center gap-1.5">
            <span className="w-1 h-3.5 rounded-sm bg-cyan-400 inline-block" />
            <span>{renderInlineMarkdown(trimmed.slice(3))}</span>
          </h2>
        );
        return;
      }
      if (trimmed.startsWith('### ')) {
        elements.push(
          <h3 key={key} className="text-xs font-bold text-cyan-200 mt-2.5 mb-1 border-b border-[#1E2A42]/60 pb-0.5">
            {renderInlineMarkdown(trimmed.slice(4))}
          </h3>
        );
        return;
      }
      if (trimmed.startsWith('#### ')) {
        elements.push(
          <h4 key={key} className="text-xs font-bold text-emerald-200 mt-2 mb-0.5">
            {renderInlineMarkdown(trimmed.slice(5))}
          </h4>
        );
        return;
      }
      if (trimmed.startsWith('##### ')) {
        elements.push(
          <h5 key={key} className="text-[11px] font-semibold text-slate-300 mt-1">
            {renderInlineMarkdown(trimmed.slice(6))}
          </h5>
        );
        return;
      }

      // Bullet lists (* or -)
      if (trimmed.startsWith('* ') || trimmed.startsWith('- ')) {
        const itemContent = trimmed.slice(2);
        elements.push(
          <div key={key} className="flex items-start gap-2 py-0.5 pl-2 text-slate-300">
            <span className="text-emerald-400 text-xs font-bold shrink-0 leading-tight">•</span>
            <div className="flex-1 leading-relaxed">{renderInlineMarkdown(itemContent)}</div>
          </div>
        );
        return;
      }

      // Numbered lists (1. 2. etc.)
      const numMatch = trimmed.match(/^(\d+)\.\s(.*)$/);
      if (numMatch) {
        elements.push(
          <div key={key} className="flex items-start gap-2 py-0.5 pl-2 text-slate-300">
            <span className="text-cyan-400 font-mono text-[11px] font-bold shrink-0 leading-tight">
              {numMatch[1]}.
            </span>
            <div className="flex-1 leading-relaxed">{renderInlineMarkdown(numMatch[2])}</div>
          </div>
        );
        return;
      }

      // Empty lines
      if (trimmed === '') {
        elements.push(<div key={key} className="h-2" />);
        return;
      }

      // Standard text line
      elements.push(
        <p key={key} className="leading-relaxed py-0.5 text-slate-200">
          {renderInlineMarkdown(line)}
        </p>
      );
    });

    return <div className="space-y-0.5">{elements}</div>;
  };

  // Render message body with styled codeblocks and parsed Markdown
  const renderMessageContent = (content: string, msgIdx: number) => {
    const parts = content.split(/(```[\s\S]*?```)/g);

    return parts.map((part, pIdx) => {
      if (part.startsWith('```') && part.endsWith('```')) {
        const lines = part.slice(3, -3).trim().split('\n');
        const lang = lines[0].trim().toLowerCase();
        const code = lines.slice(lang.length > 0 && !lines[0].includes(' ') ? 1 : 0).join('\n');
        const isShellCommand =
          ['sh', 'bash', 'powershell', 'ps1', 'cmd', 'shell', 'zsh', 'terminal'].includes(lang) ||
          code.includes('git ') ||
          code.includes('npm ') ||
          code.includes('dotnet ') ||
          code.includes('docker ') ||
          code.includes('pip ') ||
          code.includes('go ');

        const uniqueKey = `msg-${msgIdx}-code-${pIdx}`;

        return (
          <div
            key={pIdx}
            className="my-3 rounded-xl border border-[#232F45] bg-[#0A0E17] overflow-hidden shadow-sm font-sans"
          >
            <div className="flex items-center justify-between px-3 py-1.5 bg-[#121927] border-b border-[#232F45] text-xs">
              <span className="font-mono text-[11px] text-slate-300 font-semibold tracking-wider uppercase">
                {lang || 'code'}
              </span>

              <div className="flex items-center gap-2">
                {isShellCommand && onRunCommandInTerminal && (
                  <button
                    type="button"
                    onClick={() => handleRunInTerminal(code)}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/35 text-emerald-300 font-mono text-[11px] font-semibold transition-all cursor-pointer"
                    title="Chạy lệnh này trực tiếp trong Terminal"
                  >
                    <Play className="w-3 h-3 fill-emerald-400 text-emerald-400" />
                    <span>Chạy trong Terminal</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => handleCopyCode(code, uniqueKey)}
                  className="flex items-center gap-1 px-2 py-1 rounded hover:bg-[#1A253A] text-slate-400 hover:text-slate-200 transition-colors text-[11px] font-mono cursor-pointer"
                >
                  {copiedKey === uniqueKey ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-400" />
                      <span className="text-emerald-400">Đã chép</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      <span>Sao chép</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            <pre className="p-3.5 text-xs font-mono text-slate-200 overflow-x-auto leading-relaxed selectable bg-[#090D15]">
              <code>{code}</code>
            </pre>
          </div>
        );
      }

      return (
        <div key={pIdx} className="leading-relaxed">
          {renderMarkdownBlock(part, `msg-${msgIdx}-p-${pIdx}`)}
        </div>
      );
    });
  };

  const filteredWorkspaces = workspaces.filter(
    (w) =>
      w.name.toLowerCase().includes(workspaceSearch.toLowerCase()) ||
      w.folderPath.toLowerCase().includes(workspaceSearch.toLowerCase()) ||
      w.conversations.some((c) => c.title.toLowerCase().includes(workspaceSearch.toLowerCase()))
  );

  return (
    <div className="flex-1 flex h-full overflow-hidden bg-[#0B0F17] font-sans text-slate-100 select-none">
      {/* ========================================================================= */}
      {/* 1. LEFT COLUMN: ANTIGRAVITY-STYLE FOLDER WORKSPACES & CONVERSATION TREE    */}
      {/* ========================================================================= */}
      <aside
        className={`bg-[#0E1420] border-r border-[#1B2537] flex flex-col justify-between transition-all duration-200 flex-shrink-0 z-10 ${
          isSidebarOpen ? 'w-72' : 'w-0 overflow-hidden border-none'
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Top Header & New Workspace Actions */}
          <div className="p-3 border-b border-[#1B2537] flex flex-col gap-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                <FolderGit2 className="w-3.5 h-3.5 text-cyan-400" />
                <span>Không Gian Làm Việc</span>
              </span>
              <button
                type="button"
                onClick={() => setIsSidebarOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-200 rounded hover:bg-[#182235] transition-colors cursor-pointer"
                title="Thu gọn danh sách"
              >
                <PanelLeftClose className="w-4 h-4" />
              </button>
            </div>

            <button
              type="button"
              onClick={() => setIsAddWorkspaceOpen(true)}
              className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-[#162032] hover:bg-[#1D2B42] text-cyan-300 text-xs font-semibold border border-cyan-500/30 transition-all cursor-pointer shadow-sm hover:border-cyan-400"
            >
              <FolderPlus className="w-3.5 h-3.5 text-cyan-400" />
              <span>+ Thêm Thư Mục / Dự Án</span>
            </button>

            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-2 text-slate-500" />
              <input
                type="text"
                value={workspaceSearch}
                onChange={(e) => setWorkspaceSearch(e.target.value)}
                placeholder="Tìm dự án hoặc hội thoại..."
                className="w-full bg-[#080C14] border border-[#1B2537] rounded-md pl-8 pr-2.5 py-1 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500 font-sans"
              />
            </div>
          </div>

          {/* Workspaces & Sub-conversations Tree List */}
          <div className="flex-1 overflow-y-auto p-2 space-y-2">
            {filteredWorkspaces.map((ws) => {
              const isCurrentWs = ws.id === activeWorkspaceId;
              const isExpanded = expandedWorkspaces[ws.id] !== false;

              return (
                <div
                  key={ws.id}
                  className={`rounded-xl border transition-all ${
                    isCurrentWs
                      ? 'border-[#293A57] bg-[#121A2A]/70 shadow-sm'
                      : 'border-[#1A2335] bg-[#0A0E17]/40 hover:border-[#223048]'
                  }`}
                >
                  {/* Workspace Project Folder Header */}
                  <div
                    onClick={(e) => toggleWorkspaceExpand(ws.id, e)}
                    className="p-2.5 flex items-center justify-between cursor-pointer group"
                  >
                    <div className="flex items-center gap-2 overflow-hidden">
                      <button
                        type="button"
                        className="p-0.5 text-slate-400 hover:text-slate-200"
                        onClick={(e) => toggleWorkspaceExpand(ws.id, e)}
                      >
                        {isExpanded ? (
                          <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                        ) : (
                          <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                        )}
                      </button>

                      {isExpanded ? (
                        <FolderOpen className="w-4 h-4 text-amber-400 shrink-0" />
                      ) : (
                        <Folder className="w-4 h-4 text-amber-400 shrink-0" />
                      )}

                      <div className="flex flex-col min-w-0">
                        <span className="text-xs font-bold text-slate-200 truncate leading-tight">
                          {ws.name}
                        </span>
                        <span className="text-[10px] text-slate-500 font-mono truncate max-w-[140px]" title={ws.folderPath}>
                          {ws.folderPath}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={(e) => handleCreateSubConversation(ws.id, 'general', e)}
                        className="p-1 rounded text-slate-400 hover:text-emerald-300 hover:bg-[#1E2C44] transition-colors cursor-pointer"
                        title="Tạo hội thoại con mới trong dự án này"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>

                      {workspaces.length > 1 && (
                        <button
                          type="button"
                          onClick={(e) => handleDeleteWorkspace(ws.id, e)}
                          className="opacity-0 group-hover:opacity-100 p-1 text-slate-500 hover:text-rose-400 rounded transition-opacity cursor-pointer"
                          title="Xóa không gian làm việc này"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Child Sub-conversations (Antigravity threads) */}
                  {isExpanded && (
                    <div className="pl-6 pr-2 pb-2 pt-0.5 space-y-1 border-t border-[#1E2A42]/50">
                      {ws.conversations.map((conv) => {
                        const isConvActive = isCurrentWs && conv.id === ws.activeConversationId;
                        return (
                          <div
                            key={conv.id}
                            onClick={() => handleSelectConversation(ws.id, conv.id)}
                            className={`p-2 rounded-lg text-xs transition-all cursor-pointer flex items-center justify-between group/conv ${
                              isConvActive
                                ? 'bg-emerald-500/15 border border-emerald-500/35 text-emerald-200 font-medium'
                                : 'text-slate-400 hover:text-slate-200 hover:bg-[#162032] border border-transparent'
                            }`}
                          >
                            <div className="flex items-center gap-2 overflow-hidden">
                              <MessageSquare
                                className={`w-3 h-3 shrink-0 ${
                                  isConvActive ? 'text-emerald-400' : 'text-slate-500'
                                }`}
                              />
                              <div className="flex flex-col truncate">
                                <span className="truncate text-[11px] leading-tight font-sans">
                                  {conv.title}
                                </span>
                                <span className="text-[9px] text-slate-500 font-mono">
                                  {conv.updatedAt} • {conv.messages.length} tin
                                </span>
                              </div>
                            </div>

                            {ws.conversations.length > 1 && (
                              <button
                                type="button"
                                onClick={(e) => handleDeleteSubConversation(ws.id, conv.id, e)}
                                className="opacity-0 group-hover/conv:opacity-100 p-1 text-slate-500 hover:text-rose-400 rounded transition-opacity cursor-pointer"
                                title="Xóa hội thoại này"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Bottom Quick Actions */}
          <div className="p-3 border-t border-[#1B2537] flex items-center justify-between text-xs text-slate-400">
            <button
              type="button"
              onClick={() => setIsScaffoldOpen(true)}
              className="flex items-center gap-1.5 hover:text-slate-200 transition-colors cursor-pointer"
              title="Khởi tạo dự án mới từ template"
            >
              <Box className="w-3.5 h-3.5 text-cyan-400" />
              <span>Khởi tạo Dự Án</span>
            </button>

            <button
              type="button"
              onClick={onNavigateSettings}
              className="flex items-center gap-1 hover:text-slate-200 transition-colors cursor-pointer"
              title="Cấu hình API Key và Provider"
            >
              <Settings className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </aside>

      {/* ========================================================================= */}
      {/* 2. CENTER & MAIN WORKSPACE                                                */}
      {/* ========================================================================= */}
      <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#0B0F17]">
        {/* Workspace Top Bar */}
        <div className="h-11 border-b border-[#1A2433] bg-[#0E1420] px-4 flex items-center justify-between flex-shrink-0 z-10">
          <div className="flex items-center gap-3">
            {!isSidebarOpen && (
              <button
                type="button"
                onClick={() => setIsSidebarOpen(true)}
                className="p-1 text-slate-400 hover:text-slate-200 rounded hover:bg-[#182235] transition-colors cursor-pointer"
                title="Mở lịch sử hội thoại"
              >
                <PanelLeftOpen className="w-4 h-4" />
              </button>
            )}

            {/* View Mode Switcher */}
            <div className="flex items-center gap-1 bg-[#080C14] p-0.5 rounded-lg border border-[#1B2537]">
              <button
                type="button"
                onClick={() => setViewMode('planner')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition-all cursor-pointer ${
                  viewMode === 'planner'
                    ? 'bg-[#182337] text-emerald-400 font-semibold shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Code2 className="w-3.5 h-3.5" />
                <span>Trợ Lý & Kế Hoạch</span>
              </button>

              <button
                type="button"
                onClick={() => setViewMode('cli')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition-all cursor-pointer ${
                  viewMode === 'cli'
                    ? 'bg-[#182337] text-cyan-400 font-semibold shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <TerminalIcon className="w-3.5 h-3.5 text-cyan-400" />
                <span>DevDock AI CLI Agent</span>
              </button>
            </div>

            {/* Current Workspace & Folder Path Badge */}
            <div className="hidden md:flex items-center gap-2 pl-2 border-l border-[#1A2433]">
              <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-[#080C14] border border-[#1E2A44] text-xs">
                <Folder className="w-3 h-3 text-amber-400" />
                <span className="text-slate-200 font-semibold">{activeWorkspace?.name}</span>
                <span className="text-slate-500 font-mono text-[10px]">({activeWorkspace?.folderPath})</span>
              </div>

              {activeWorkspace && (
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => {
                      if (onOpenTerminal && activeWorkspace.folderPath) {
                        onOpenTerminal(activeWorkspace.folderPath);
                        onShowToast(`Đã mở Terminal tại ${activeWorkspace.name}`, 'info');
                      } else if (onRunCommandInTerminal && activeWorkspace.folderPath) {
                        onRunCommandInTerminal(`cd "${activeWorkspace.folderPath}"`);
                      }
                    }}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-800/90 hover:bg-slate-700 text-slate-200 hover:text-emerald-300 text-[11px] font-mono transition-colors cursor-pointer border border-slate-700/60 shadow-sm"
                    title={`Mở phiên Terminal tại thư mục "${activeWorkspace.folderPath}"`}
                  >
                    <TerminalIcon className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Mở Terminal tại đây</span>
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      if (activeWorkspace.folderPath) {
                        try {
                          await api.openTerminal(activeWorkspace.folderPath);
                          onShowToast(`Đã mở Windows Terminal ngoài cho ${activeWorkspace.name}`, 'success');
                        } catch (e: any) {
                          onShowToast(e.message || 'Không thể mở terminal ngoài', 'error');
                        }
                      }
                    }}
                    className="p-1 rounded bg-slate-800/90 hover:bg-slate-700 text-slate-400 hover:text-cyan-300 text-[11px] transition-colors cursor-pointer border border-slate-700/60 shadow-sm"
                    title="Mở thư mục trong Windows Terminal / PowerShell ngoài (External Window)"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Right Provider & Model Controls */}
          <div className="flex items-center gap-2">
            {activeProvider ? (
              <div className="flex items-center gap-1.5 bg-[#080C14] border border-[#1B2537] rounded-lg px-2.5 py-1 text-xs">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="font-semibold text-slate-200">{activeProvider.name}</span>
                <select
                  value={selectedModel || activeProvider.defaultModel}
                  onChange={(e) => handleUpdateSelectedModel(e.target.value)}
                  className="bg-transparent text-emerald-400 text-xs font-mono font-medium focus:outline-none cursor-pointer"
                >
                  <option value={activeProvider.defaultModel} className="bg-[#0B0F17] text-slate-200">
                    {activeProvider.defaultModel}
                  </option>
                  <option value="deepseek-chat" className="bg-[#0B0F17] text-slate-200">
                    deepseek-chat
                  </option>
                  <option value="deepseek-reasoner" className="bg-[#0B0F17] text-slate-200">
                    deepseek-reasoner
                  </option>
                  <option value="gpt-4o" className="bg-[#0B0F17] text-slate-200">
                    gpt-4o
                  </option>
                  <option value="gpt-4o-mini" className="bg-[#0B0F17] text-slate-200">
                    gpt-4o-mini
                  </option>
                  <option value="claude-3-5-sonnet-20241022" className="bg-[#0B0F17] text-slate-200">
                    claude-3-5-sonnet
                  </option>
                </select>
              </div>
            ) : (
              <button
                type="button"
                onClick={onNavigateSettings}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-500/20 text-rose-300 border border-rose-500/40 text-xs cursor-pointer"
              >
                <span>Chưa có Provider AI</span>
              </button>
            )}

            <button
              type="button"
              onClick={onNavigateSettings}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-[#162032] transition-colors cursor-pointer"
              title="Cài đặt AI"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* VIEW MODE 1: PLANNER & CHAT AGENT */}
        <div className={`flex-1 overflow-hidden ${viewMode === 'planner' ? 'flex flex-col' : 'hidden'}`}>
          {/* Messages Scroll Area */}
            <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4">
              {/* Execution Plan Card (if available in this sub-conversation) */}
              {activeConversation?.plan && (
                <div className="p-4 rounded-2xl bg-[#0E1524] border border-emerald-500/30 shadow-lg mb-4">
                  <div className="flex items-center justify-between border-b border-[#1E2A42] pb-3 mb-3">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400">
                        <CheckSquare className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                          <span>{activeConversation.plan.title}</span>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                            {activeConversation.plan.status.toUpperCase()}
                          </span>
                        </h3>
                        {activeConversation.plan.targetDirectory && (
                          <span className="text-[11px] font-mono text-slate-400">
                            Thư mục: {activeConversation.plan.targetDirectory}
                          </span>
                        )}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleExecutePlanInTerminal}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs transition-colors cursor-pointer"
                    >
                      <Zap className="w-3.5 h-3.5" />
                      <span>Thực thi Kế hoạch</span>
                    </button>
                  </div>

                  <div className="space-y-2">
                    {activeConversation.plan.steps.map((step, idx) => {
                      const isDone = step.status === 'done';
                      return (
                        <div
                          key={step.id}
                          className={`p-2.5 rounded-xl border text-xs flex items-center justify-between transition-all ${
                            isDone
                              ? 'bg-emerald-500/10 border-emerald-500/30 text-slate-300'
                              : 'bg-[#080C14] border-[#1E2A42] text-slate-200'
                          }`}
                        >
                          <div
                            onClick={() => handleTogglePlanStep(step.id)}
                            className="flex items-center gap-2.5 cursor-pointer flex-1"
                          >
                            {isDone ? (
                              <CheckSquare className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                            ) : (
                              <Square className="w-4 h-4 text-slate-500 flex-shrink-0" />
                            )}
                            <div className="flex flex-col">
                              <span
                                className={`font-semibold ${
                                  isDone ? 'line-through text-slate-400' : 'text-slate-100'
                                }`}
                              >
                                Bước {idx + 1}: {step.title}
                              </span>
                              {step.description && (
                                <span className="text-[11px] text-slate-400 mt-0.5">{step.description}</span>
                              )}
                              {step.command && (
                                <code className="text-[11px] font-mono text-cyan-400 mt-1 truncate max-w-xl">
                                  $ {step.command}
                                </code>
                              )}
                            </div>
                          </div>

                          {step.command && onRunCommandInTerminal && (
                            <button
                              type="button"
                              onClick={() => handleRunInTerminal(step.command!)}
                              className="px-2.5 py-1 rounded bg-[#182337] hover:bg-[#20304D] text-slate-300 text-[11px] font-mono flex items-center gap-1 cursor-pointer transition-colors"
                              title="Chạy bước này vào Terminal"
                            >
                              <Play className="w-3 h-3 text-emerald-400 fill-emerald-400" />
                              <span>Chạy</span>
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Chat Messages */}
              {activeConversation?.messages.map((msg, idx) => {
                const isUser = msg.role === 'user';
                return (
                  <div
                    key={idx}
                    className={`flex gap-3 max-w-4xl mx-auto ${isUser ? 'justify-end' : 'justify-start'}`}
                  >
                    {!isUser && (
                      <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-emerald-500/20 to-cyan-500/20 border border-emerald-500/40 flex items-center justify-center flex-shrink-0 text-emerald-400 shadow-sm mt-1">
                        <Sparkles className="w-4 h-4" />
                      </div>
                    )}

                    <div
                      className={`flex flex-col ${
                        isUser
                          ? 'bg-[#162032] border border-[#253654] text-slate-100 rounded-2xl rounded-tr-sm'
                          : 'bg-[#0E1524] border border-[#1E2A42] text-slate-200 rounded-2xl rounded-tl-sm'
                      } p-4 shadow-sm max-w-3xl text-xs md:text-sm`}
                    >
                      <div className="flex items-center justify-between gap-4 mb-2 pb-1 border-b border-white/5 text-[11px] font-mono text-slate-400">
                        <span className="font-semibold text-slate-300">
                          {isUser ? 'Bạn' : `${activeProvider?.name || 'DevDock AI'} (${selectedModel || 'Default'})`}
                        </span>
                        <span>{msg.timestamp}</span>
                      </div>

                      <div className="text-slate-100 font-sans leading-relaxed selectable">
                        {renderMessageContent(msg.content, idx)}
                      </div>
                    </div>

                    {isUser && (
                      <div className="w-8 h-8 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center flex-shrink-0 text-slate-300 shadow-sm mt-1 font-mono text-xs font-bold">
                        U
                      </div>
                    )}
                  </div>
                );
              })}

              {isLoading && (
                <div className="flex gap-3 max-w-4xl mx-auto justify-start items-center">
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 animate-spin">
                    <RefreshCw className="w-4 h-4" />
                  </div>
                  <div className="p-3 rounded-2xl bg-[#0E1524] border border-[#1E2A42] text-xs text-slate-400 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                    <span>DevDock AI đang phân tích và soạn câu trả lời chuyên sâu...</span>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Quick Action Chips */}
            <div className="px-4 py-2 bg-[#0A0E17] border-t border-[#182335] flex items-center gap-2 overflow-x-auto flex-shrink-0">
              <span className="text-[11px] font-mono text-slate-500 uppercase tracking-wider">Gợi ý:</span>
              {[
                { label: '📋 Lập Kế Hoạch', prompt: 'Hãy lập kế hoạch thực thi chi tiết theo từng bước để hoàn thiện dự án này.' },
                { label: '🐛 Phân Tích & Tìm Lỗi', prompt: 'Hãy kiểm tra và phân tích các lỗi tiềm ẩn phổ biến trong kiến trúc dự án.' },
                { label: '⚡ Tối Ưu Hiệu Năng', prompt: 'Gợi ý các kỹ thuật tối ưu hóa hiệu năng, giảm bundle size và tăng tốc độ xử lý.' },
                { label: '📝 Viết README', prompt: 'Hãy soạn thảo file README.md chuyên nghiệp kèm hướng dẫn cài đặt và chạy dự án.' },
                { label: '📦 Khởi Tạo Dự Án', action: () => setIsScaffoldOpen(true) },
              ].map((chip, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => (chip.action ? chip.action() : handleSendPrompt(chip.prompt))}
                  className="whitespace-nowrap px-2.5 py-1 rounded-lg bg-[#111A29] hover:bg-[#19273D] text-slate-300 hover:text-slate-100 border border-[#1E2B40] text-[11px] font-medium transition-colors cursor-pointer"
                >
                  {chip.label}
                </button>
              ))}
            </div>

            {/* Chat Input Box */}
            <div className="p-3 md:p-4 bg-[#0A0E17] border-t border-[#1B2537] flex-shrink-0">
              <div className="max-w-4xl mx-auto flex flex-col gap-2">
                <div className="relative rounded-2xl border border-[#233148] bg-[#0E1524] focus-within:border-cyan-500/70 focus-within:ring-1 focus-within:ring-cyan-500/30 transition-all">
                  <textarea
                    ref={inputRef}
                    value={inputPrompt}
                    onChange={(e) => setInputPrompt(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={`Hỏi DevDock AI bất kỳ điều gì về ${activeWorkspace?.name || 'dự án'} (Nhấn Enter để gửi, Shift+Enter để xuống dòng)...`}
                    rows={2}
                    className="w-full bg-transparent px-4 py-3 text-xs md:text-sm text-slate-100 placeholder-slate-500 focus:outline-none resize-none selectable"
                  />

                  <div className="flex items-center justify-between px-3 pb-2.5 pt-1 text-[11px] text-slate-400">
                    <span className="font-mono text-slate-500">
                      ↑↓: Lịch sử lệnh • Thư mục: {activeWorkspace?.folderPath}
                    </span>

                    <button
                      type="button"
                      onClick={() => handleSendPrompt()}
                      disabled={isLoading || !inputPrompt.trim()}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium text-xs transition-colors cursor-pointer ${
                        isLoading || !inputPrompt.trim()
                          ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                          : 'bg-blue-600 hover:bg-blue-500 text-white'
                      }`}
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Gửi</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

        {/* VIEW MODE 2: CUSTOM DEVDOCK AI CLI AGENT */}
        <div className={`flex-1 overflow-hidden ${viewMode === 'cli' ? 'flex flex-col' : 'hidden'}`}>
          <DevDockAiCliTerminal
            activeWorkspace={activeWorkspace}
            activeProvider={activeProvider}
            selectedModel={selectedModel}
            isVisible={viewMode === 'cli'}
            onRunCommandInTerminal={onRunCommandInTerminal}
            onShowToast={onShowToast}
          />
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. MODAL: ADD WORKSPACE / FOLDER                                          */}
      {/* ========================================================================= */}
      {isAddWorkspaceOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0E1524] border border-[#253550] rounded-2xl max-w-md w-full p-6 shadow-2xl flex flex-col gap-4 animate-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#1E2A42] pb-3">
              <div className="flex items-center gap-2">
                <FolderPlus className="w-5 h-5 text-cyan-400" />
                <h2 className="text-sm font-bold text-slate-100">
                  Thêm Không Gian Dự Án / Thư Mục
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setIsAddWorkspaceOpen(false)}
                className="text-slate-400 hover:text-slate-200 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Quick pick from existing DevDock projects */}
            {projects && projects.length > 0 && (
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-semibold text-slate-300">
                  Chọn nhanh từ danh sách Dự án của DevDock:
                </label>
                <div className="max-h-32 overflow-y-auto space-y-1 bg-[#080C14] p-2 rounded-lg border border-[#1E2A42]">
                  {projects.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => {
                        setNewWsName(p.name);
                        setNewWsPath(p.path);
                      }}
                      className="w-full text-left p-1.5 rounded hover:bg-[#162238] flex items-center justify-between text-xs cursor-pointer transition-colors"
                    >
                      <span className="text-slate-200 font-semibold">{p.name}</span>
                      <span className="text-slate-500 font-mono text-[10px] truncate max-w-[160px]">{p.path}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="flex flex-col gap-3 text-xs">
              <div className="flex flex-col gap-1">
                <label className="text-slate-300 font-medium">Tên dự án:</label>
                <input
                  type="text"
                  value={newWsName}
                  onChange={(e) => setNewWsName(e.target.value)}
                  placeholder="ToolTienich, WebApp, MyApi..."
                  className="bg-[#080C14] border border-[#1E2A42] rounded-lg px-3 py-2 text-slate-100 font-sans focus:outline-none focus:border-cyan-500 selectable"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-slate-300 font-medium">Đường dẫn thư mục trên máy tính:</label>
                <input
                  type="text"
                  value={newWsPath}
                  onChange={(e) => setNewWsPath(e.target.value)}
                  placeholder="D:\ToolTienich hoặc C:\Projects\MyApp"
                  className="bg-[#080C14] border border-[#1E2A42] rounded-lg px-3 py-2 text-slate-100 font-mono focus:outline-none focus:border-cyan-500 selectable"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#1E2A42]">
              <button
                type="button"
                onClick={() => setIsAddWorkspaceOpen(false)}
                className="px-3 py-1.5 text-xs text-slate-400 hover:text-slate-200 cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleCreateWorkspace}
                className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium rounded-lg cursor-pointer transition-colors"
              >
                Tạo Không Gian Dự Án
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. MODAL: PROJECT SCAFFOLDING WIZARD                                      */}
      {/* ========================================================================= */}
      {isScaffoldOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0E1524] border border-[#253550] rounded-2xl max-w-2xl w-full p-6 shadow-2xl flex flex-col gap-5 animate-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#1E2A42] pb-3">
              <div className="flex items-center gap-2">
                <Box className="w-5 h-5 text-cyan-400" />
                <h2 className="text-base font-bold text-slate-100">
                  Khởi Tạo Dự Án Mới (Project Scaffolding Wizard)
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setIsScaffoldOpen(false)}
                className="text-slate-400 hover:text-slate-200 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="flex flex-col gap-2">
              <span className="text-xs font-semibold text-slate-300">Chọn Template / Công nghệ:</span>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {PROJECT_TEMPLATES.map((tmpl) => {
                  const isSelected = selectedTemplate?.id === tmpl.id;
                  return (
                    <div
                      key={tmpl.id}
                      onClick={() => {
                        setSelectedTemplate(tmpl);
                        setProjectNameInput(tmpl.defaultDirName);
                      }}
                      className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-1.5 ${
                        isSelected
                          ? 'bg-[#17253D] border-cyan-400 shadow-md text-slate-100'
                          : 'bg-[#080C14] border-[#1E2C44] text-slate-400 hover:text-slate-200 hover:border-slate-600'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-base">{tmpl.icon}</span>
                        <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-slate-800 text-slate-300">
                          {tmpl.category}
                        </span>
                      </div>
                      <div className="font-semibold text-xs text-slate-200 leading-tight mt-1">{tmpl.name}</div>
                    </div>
                  );
                })}
              </div>
            </div>

            {selectedTemplate && (
              <div className="p-4 rounded-xl bg-[#080C14] border border-[#1E2C44] flex flex-col gap-3 text-xs">
                <div className="flex flex-col gap-1">
                  <label className="text-slate-300 font-medium">Tên thư mục dự án:</label>
                  <input
                    type="text"
                    value={projectNameInput}
                    onChange={(e) => setProjectNameInput(e.target.value)}
                    placeholder="my-new-project"
                    className="bg-[#0E1524] border border-[#1E2A42] rounded-lg px-3 py-2 text-slate-100 font-mono focus:outline-none focus:border-cyan-500 selectable"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-slate-300 font-medium">Thư mục cha lưu trữ:</label>
                  <input
                    type="text"
                    value={targetDirInput}
                    onChange={(e) => setTargetDirInput(e.target.value)}
                    placeholder="D:\Projects hoặc C:\repos"
                    className="bg-[#0E1524] border border-[#1E2A42] rounded-lg px-3 py-2 text-slate-100 font-mono focus:outline-none focus:border-cyan-500 selectable"
                  />
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                  <span>Lệnh sẽ tạo:</span>
                  <code className="text-cyan-400 font-mono truncate max-w-sm">
                    {selectedTemplate.commands.scaffold.replace(selectedTemplate.defaultDirName, projectNameInput)}
                  </code>
                </div>
              </div>
            )}

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-[#1E2A42]">
              <button
                type="button"
                onClick={() => setIsScaffoldOpen(false)}
                className="px-4 py-2 rounded-lg text-xs text-slate-400 hover:text-slate-200 cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleApplyScaffoldingPlan}
                disabled={!selectedTemplate || !projectNameInput.trim()}
                className={`px-4 py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                  !selectedTemplate || !projectNameInput.trim()
                    ? 'bg-slate-800 text-slate-600 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-500 text-white'
                }`}
              >
                Tạo Kế Hoạch Thực Thi
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// =============================================================================
// SUBCOMPONENT: CUSTOM DEVDOCK AI CLI TERMINAL AGENT
// =============================================================================
interface DevDockAiCliTerminalProps {
  activeWorkspace: AiWorkspaceProject;
  activeProvider: AiProviderConfig | null;
  selectedModel: string;
  isVisible?: boolean;
  onRunCommandInTerminal?: (cmd: string) => void;
  onShowToast: (msg: string, type: 'success' | 'error' | 'info') => void;
}

const DevDockAiCliTerminal: React.FC<DevDockAiCliTerminalProps> = ({
  activeWorkspace,
  activeProvider,
  selectedModel,
  isVisible = true,
  onRunCommandInTerminal,
  onShowToast,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<XTerm | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);

  const [cliInput, setCliInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [history, setHistory] = useState<string[]>([]);
  const [histIdx, setHistIdx] = useState<number>(-1);

  const currentLineRef = useRef<string>('');
  const historyRef = useRef<string[]>([]);
  const histIdxRef = useRef<number>(-1);
  const isProcessingRef = useRef<boolean>(false);
  const bannerDrawnRef = useRef<boolean>(false);

  useEffect(() => {
    historyRef.current = history;
  }, [history]);

  useEffect(() => {
    histIdxRef.current = histIdx;
  }, [histIdx]);

  useEffect(() => {
    isProcessingRef.current = isProcessing;
  }, [isProcessing]);

  // Print ANSI banner into xterm
  const printBanner = (term: XTerm) => {
    term.reset();
    const c1 = '\x1b[38;2;52;211;153m'; // emerald light
    const c2 = '\x1b[38;2;16;185;129m'; // emerald
    const c3 = '\x1b[38;2;20;184;166m'; // teal
    const c4 = '\x1b[38;2;6;182;212m';  // cyan
    const c5 = '\x1b[38;2;59;130;246m'; // blue
    const c6 = '\x1b[38;2;99;102;241m'; // indigo
    const white = '\x1b[38;2;248;250;252m';
    const yellow = '\x1b[38;2;251;191;36m';
    const gray = '\x1b[38;2;148;163;184m';
    const border = '\x1b[38;2;51;65;85m'; // slate-700
    const reset = '\x1b[0m';
    const bold = '\x1b[1m';

    term.writeln(`${border}┌─────────────────────────────────────────────────────────────────────────────┐${reset}`);
    term.writeln(`${border}│${reset}  ${c1}${bold}██████╗ ███████╗██╗   ██╗██████╗  ██████╗  ██████╗██╗  ██╗${reset}                 ${border}│${reset}`);
    term.writeln(`${border}│${reset}  ${c2}${bold}██╔══██╗██╔════╝██║   ██║██╔══██╗██╔═══██╗██╔════╝██║ ██╔╝${reset}                 ${border}│${reset}`);
    term.writeln(`${border}│${reset}  ${c3}${bold}██║  ██║█████╗  ██║   ██║██║  ██║██║   ██║██║     █████═╝ ${reset}                 ${border}│${reset}`);
    term.writeln(`${border}│${reset}  ${c4}${bold}██║  ██║██╔══╝  ╚██╗ ██╔╝██║  ██║██║   ██║██║     ██╔═██╗ ${reset}                 ${border}│${reset}`);
    term.writeln(`${border}│${reset}  ${c5}${bold}██████╔╝███████╗ ╚████╔╝ ██████╔╝╚██████╔╝╚██████╗██║  ██╗${reset}                 ${border}│${reset}`);
    term.writeln(`${border}│${reset}  ${c6}${bold}╚═════╝ ╚══════╝  ╚═══╝  ╚═════╝  ╚═════╝  ╚═════╝╚═╝  ╚═╝${reset}                 ${border}│${reset}`);
    term.writeln(`${border}│${reset}                                                                             ${border}│${reset}`);
    term.writeln(`${border}│${reset}  ${c4}${bold}⚡ DEVDOCK AI INTERACTIVE CLI AGENT${reset} ${gray}• WORKSTATION TERMINAL COPILOT${reset}     ${border}│${reset}`);
    term.writeln(`${border}└─────────────────────────────────────────────────────────────────────────────┘${reset}`);
    term.writeln(`  ${c4}📂 Dự án   :${reset} ${white}${bold}${activeWorkspace?.name || 'DevDock'}${reset} ${gray}(${activeWorkspace?.folderPath || 'N/A'})${reset}`);
    term.writeln(`  ${c2}🤖 Mô hình :${reset} ${yellow}${activeProvider?.name || 'Chưa cấu hình'}${reset} ${gray}• ${selectedModel || activeProvider?.defaultModel || 'N/A'}${reset}`);
    term.writeln(`  ${c3}💡 Lệnh tắt:${reset} ${c4}/plan${reset}${gray}, ${reset}${c4}/commit${reset}${gray}, ${reset}${c4}/explain${reset}${gray}, ${reset}${c4}/git <lệnh>${reset}${gray}, ${reset}${c4}/help${reset}${gray}, ${reset}${c4}/clear${reset} ${gray}hoặc chat trực tiếp!${reset}\r\n`);
    term.write(`${c4}${bold}devdock (${activeWorkspace?.name || 'main'}) > ${reset}`);
    currentLineRef.current = '';
    setCliInput('');
  };

  const doFit = () => {
    if (!containerRef.current || !xtermRef.current || !fitAddonRef.current) return;
    if (containerRef.current.clientWidth < 50 || containerRef.current.clientHeight < 50) return;
    try {
      fitAddonRef.current.fit();
      const term = xtermRef.current;
      if (term.cols >= 40 && !bannerDrawnRef.current) {
        printBanner(term);
        bannerDrawnRef.current = true;
      }
    } catch { }
  };

  useEffect(() => {
    if (isVisible) {
      const t1 = setTimeout(doFit, 60);
      const t2 = setTimeout(doFit, 200);
      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
      };
    }
  }, [isVisible]);

  useEffect(() => {
    if (!containerRef.current) return;

    bannerDrawnRef.current = false;
    const term = new XTerm({
      cursorBlink: true,
      fontFamily: "'Cascadia Code', 'Fira Code', Consolas, monospace",
      fontSize: 13,
      theme: {
        background: '#060911',
        foreground: '#F1F5F9',
        cursor: '#10B981',
        selectionBackground: '#1E2A44',
      },
      convertEol: true,
    });

    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    term.open(containerRef.current);

    xtermRef.current = term;
    fitAddonRef.current = fitAddon;

    if (containerRef.current.clientWidth >= 50 && containerRef.current.clientHeight >= 50) {
      try {
        fitAddon.fit();
        if (term.cols >= 40) {
          printBanner(term);
          bannerDrawnRef.current = true;
        }
      } catch { }
    }

    const resizeObserver = new ResizeObserver(() => {
      doFit();
    });
    resizeObserver.observe(containerRef.current);

    // Register interactive onData listener so user can type DIRECTLY into xterm
    const onDataDisposable = term.onData((data) => {
      if (isProcessingRef.current) return;
      const promptStr = `devdock (${activeWorkspace?.name || 'main'}) > `;

      // Enter key
      if (data === '\r') {
        const cmd = currentLineRef.current;
        currentLineRef.current = '';
        setCliInput('');
        executeCliCommand(cmd, false);
        return;
      }

      // Backspace key
      if (data === '\u007F' || data === '\b') {
        if (currentLineRef.current.length > 0) {
          currentLineRef.current = currentLineRef.current.slice(0, -1);
          setCliInput(currentLineRef.current);
          term.write('\b \b');
        }
        return;
      }

      // Ctrl + C
      if (data === '\u0003') {
        currentLineRef.current = '';
        setCliInput('');
        term.writeln('^C');
        term.write(`\x1b[38;2;6;182;212m\x1b[1m${promptStr}\x1b[0m`);
        return;
      }

      // Arrow Up (History previous)
      if (data === '\u001b[A') {
        if (historyRef.current.length > 0) {
          const nextIdx = Math.min(histIdxRef.current + 1, historyRef.current.length - 1);
          histIdxRef.current = nextIdx;
          setHistIdx(nextIdx);
          const chosen = historyRef.current[nextIdx];
          term.write(`\r\x1b[K\x1b[38;2;6;182;212m\x1b[1m${promptStr}\x1b[0m${chosen}`);
          currentLineRef.current = chosen;
          setCliInput(chosen);
        }
        return;
      }

      // Arrow Down (History next)
      if (data === '\u001b[B') {
        if (histIdxRef.current >= 0) {
          const prevIdx = histIdxRef.current - 1;
          histIdxRef.current = prevIdx;
          setHistIdx(prevIdx);
          const chosen = prevIdx >= 0 ? historyRef.current[prevIdx] : '';
          term.write(`\r\x1b[K\x1b[38;2;6;182;212m\x1b[1m${promptStr}\x1b[0m${chosen}`);
          currentLineRef.current = chosen;
          setCliInput(chosen);
        }
        return;
      }

      // Ignore other ANSI escape sequences
      if (data.startsWith('\u001b')) {
        return;
      }

      // Standard printable characters
      currentLineRef.current += data;
      setCliInput(currentLineRef.current);
      term.write(data);
    });

    const handleResize = () => {
      doFit();
    };
    window.addEventListener('resize', handleResize);

    return () => {
      onDataDisposable.dispose();
      resizeObserver.disconnect();
      window.removeEventListener('resize', handleResize);
      term.dispose();
    };
  }, [activeWorkspace?.id, activeProvider?.id]);

  // Format markdown to terminal ANSI
  const formatMarkdownToAnsi = (text: string) => {
    const cyan = '\x1b[38;2;6;182;212m';
    const emerald = '\x1b[38;2;16;185;129m';
    const yellow = '\x1b[38;2;251;191;36m';
    const gray = '\x1b[38;2;148;163;184m';
    const reset = '\x1b[0m';
    const bold = '\x1b[1m';

    const lines = text.split('\n');
    let inCodeBlock = false;

    return lines
      .map((line) => {
        if (line.startsWith('```')) {
          inCodeBlock = !inCodeBlock;
          return inCodeBlock
            ? `${gray}─── ${yellow}${line.slice(3) || 'CODE'}${gray} ───────────────────────────────────────${reset}`
            : `${gray}────────────────────────────────────────────────────────${reset}`;
        }

        if (inCodeBlock) {
          return `  ${yellow}${line}${reset}`;
        }

        // Horizontal rules
        if (line.trim() === '---' || line.trim() === '***' || line.trim() === '___') {
          return `${gray}────────────────────────────────────────────────────────${reset}`;
        }

        // Headings
        if (line.startsWith('##### ')) {
          return `\r\n${gray}${bold}${line.slice(6)}${reset}`;
        }
        if (line.startsWith('#### ')) {
          return `\r\n${cyan}${bold}▪ ${line.slice(5)}${reset}`;
        }
        if (line.startsWith('### ')) {
          return `\r\n${cyan}${bold}■ ${line.slice(4)}${reset}`;
        }
        if (line.startsWith('## ')) {
          return `\r\n${emerald}${bold}▶ ${line.slice(3)}${reset}`;
        }
        if (line.startsWith('# ')) {
          return `\r\n${emerald}${bold}★ ${line.slice(2)}${reset}`;
        }

        let formattedLine = line;
        if (line.startsWith('- ') || line.startsWith('* ')) {
          formattedLine = `  ${emerald}•${reset} ${line.slice(2)}`;
        } else if (/^\d+\.\s/.test(line)) {
          const match = line.match(/^(\d+\.)\s(.*)$/);
          if (match) {
            formattedLine = `  ${cyan}${match[1]}${reset} ${match[2]}`;
          }
        }

        // Format inline bold: **word** -> bold ANSI
        formattedLine = formattedLine.replace(/\*\*(.*?)\*\*/g, `${bold}$1${reset}`);
        // Format inline code: `word` -> yellow ANSI
        formattedLine = formattedLine.replace(/`([^`]+)`/g, `${yellow}$1${reset}`);

        return formattedLine;
      })
      .join('\r\n');
  };

  // Execute command in DevDock AI CLI
  const executeCliCommand = async (cmdString: string, echoCommand: boolean = true) => {
    const cmd = cmdString.trim();
    if (!cmd || isProcessing) return;

    const term = xtermRef.current;
    if (!term) return;

    const cyan = '\x1b[38;2;6;182;212m';
    const emerald = '\x1b[38;2;16;185;129m';
    const yellow = '\x1b[38;2;251;191;36m';
    const red = '\x1b[38;2;244;63;94m';
    const gray = '\x1b[38;2;148;163;184m';
    const reset = '\x1b[0m';
    const bold = '\x1b[1m';

    // Echo command if executed from input bar rather than directly typed in terminal
    if (echoCommand) {
      term.writeln(`${cmd}`);
    } else {
      term.writeln('');
    }

    setHistory((prev) => [cmd, ...prev.filter((c) => c !== cmd)]);
    setHistIdx(-1);
    setCliInput('');
    currentLineRef.current = '';

    // Handle Built-in Slash Commands
    if (cmd === '/clear') {
      doFit();
      printBanner(term);
      return;
    }

    if (cmd === '/help') {
      term.writeln(`\r\n${emerald}${bold}BẢNG LỆNH HỖ TRỢ DEVDOCK AI AGENT CLI:${reset}`);
      term.writeln(`  ${cyan}/plan <nhiệm vụ>${reset}       - Lập kế hoạch triển khai chi tiết có mã lệnh`);
      term.writeln(`  ${cyan}/scaffold <template>${reset}   - Khởi tạo dự án mới (react, next, dotnet, etc.)`);
      term.writeln(`  ${cyan}/commit <nội dung>${reset}     - Soạn commit message thông minh theo Conventional Commits`);
      term.writeln(`  ${cyan}/explain <code/lỗi>${reset}    - Phân tích mã nguồn hoặc khắc phục lỗi lập trình`);
      term.writeln(`  ${cyan}/git <lệnh>${reset}            - Chạy lệnh git trực tiếp trong thư mục dự án`);
      term.writeln(`  ${cyan}/clear${reset}                 - Xóa màn hình terminal`);
      term.writeln(`  ${cyan}<câu hỏi bất kỳ>${reset}      - Trò chuyện với AI bằng ngữ cảnh thư mục dự án\r\n`);
      term.write(`${cyan}${bold}devdock (${activeWorkspace?.name || 'main'}) > ${reset}`);
      return;
    }

    if (cmd.startsWith('/git ')) {
      const gitArgs = cmd.slice(5).trim();
      term.writeln(`${gray}[Git Exec] Chạy: git ${gitArgs} tại ${activeWorkspace?.folderPath}...${reset}`);
      if (onRunCommandInTerminal) {
        onRunCommandInTerminal(`cd "${activeWorkspace.folderPath}"; git ${gitArgs}`);
        term.writeln(`${emerald}✔ Đã chuyển lệnh git vào Terminal console!${reset}\r\n`);
      }
      term.write(`${cyan}${bold}devdock (${activeWorkspace?.name || 'main'}) > ${reset}`);
      return;
    }

    if (!activeProvider) {
      term.writeln(`\r\n${red}✖ Lỗi: Chưa cấu hình Nhà cung cấp API AI. Hãy mở Cài đặt để thêm key.${reset}\r\n`);
      term.write(`${cyan}${bold}devdock (${activeWorkspace?.name || 'main'}) > ${reset}`);
      return;
    }

    // Call AI with context
    setIsProcessing(true);
    term.writeln(`${gray}[DevDock AI đang suy nghĩ qua ${activeProvider.name}...]${reset}`);

    let promptToSend = cmd;
    if (cmd.startsWith('/plan ')) {
      promptToSend = `Hãy lập KẾ HOẠCH THỰC THI (Execution Plan) chi tiết từng bước có thể chạy dòng lệnh cho nhiệm vụ: "${cmd.slice(6)}". Thư mục dự án: ${activeWorkspace.folderPath}`;
    } else if (cmd.startsWith('/commit ')) {
      promptToSend = `Hãy tạo Conventional Commit message chuẩn (feat:, fix:, chore:, refactor:) cho nội dung sau: "${cmd.slice(8)}"`;
    } else if (cmd.startsWith('/explain ')) {
      promptToSend = `Hãy giải thích chi tiết và đưa ra hướng dẫn khắc phục cho đoạn mã/lỗi sau: "${cmd.slice(9)}"`;
    }

    try {
      const systemPrompt = `Bạn là DevDock AI Senior CLI Terminal Agent.
Ngữ cảnh làm việc:
- Tên dự án: ${activeWorkspace.name}
- Thư mục: ${activeWorkspace.folderPath}
Hãy trả lời ngắn gọn, chuẩn xác, định dạng rõ ràng, code block bọc trong \`\`\` để hiển thị tối ưu trên Terminal ANSI.`;

      const res = await api.sendAiChat({
        providerId: activeProvider.id,
        model: selectedModel || activeProvider.defaultModel,
        messages: [{ role: 'user', content: promptToSend }],
        systemPrompt,
        temperature: 0.3,
      });

      if (res.success) {
        term.writeln(`\r\n${emerald}${bold}● DevDock AI Response (${res.modelUsed}):${reset}`);
        const formatted = formatMarkdownToAnsi(res.message);
        term.writeln(formatted);
        term.writeln(`\r\n${emerald}✔ Hoàn tất trong ${res.durationMs}ms${reset}\r\n`);
      } else {
        term.writeln(`\r\n${red}✖ Lỗi: ${res.errorMessage || 'Không thể tạo phản hồi'}${reset}\r\n`);
      }
    } catch (err: any) {
      term.writeln(`\r\n${red}✖ Lỗi kết nối: ${err.message || 'Network error'}${reset}\r\n`);
    } finally {
      setIsProcessing(false);
      term.write(`${cyan}${bold}devdock (${activeWorkspace?.name || 'main'}) > ${reset}`);
    }
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      executeCliCommand(cliInput);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (history.length > 0) {
        const nextIdx = Math.min(histIdx + 1, history.length - 1);
        setHistIdx(nextIdx);
        setCliInput(history[nextIdx]);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      const prevIdx = histIdx - 1;
      if (prevIdx < 0) {
        setHistIdx(-1);
        setCliInput('');
      } else {
        setHistIdx(prevIdx);
        setCliInput(history[prevIdx]);
      }
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#060911]">
      {/* CLI Agent Top Bar */}
      <div className="p-2.5 bg-[#0A0E17] border-b border-[#1E293B] flex items-center justify-between text-xs px-4 flex-shrink-0">
        <div className="flex items-center gap-2">
          <TerminalIcon className="w-4 h-4 text-cyan-400" />
          <span className="font-bold text-slate-200">DevDock Interactive AI CLI Agent</span>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
            Sẵn sàng
          </span>
        </div>

        {/* Quick Slash Command Chips */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {[
            { label: '/plan', cmd: '/plan ' },
            { label: '/commit', cmd: '/commit ' },
            { label: '/explain', cmd: '/explain ' },
            { label: '/git status', cmd: '/git status' },
            { label: '/help', cmd: '/help' },
            { label: '/clear', cmd: '/clear' },
          ].map((sc) => (
            <button
              key={sc.label}
              type="button"
              onClick={() => {
                setCliInput(sc.cmd);
                if (sc.cmd === '/help' || sc.cmd === '/clear' || sc.cmd === '/git status') {
                  executeCliCommand(sc.cmd);
                }
              }}
              className="text-[11px] font-mono px-2 py-0.5 rounded bg-[#131D2E] hover:bg-[#1E2C44] text-cyan-300 border border-cyan-500/20 transition-colors cursor-pointer"
            >
              {sc.label}
            </button>
          ))}
        </div>
      </div>

      {/* Embedded Terminal Viewport */}
      <div className="flex-1 overflow-hidden relative">
        <div
          ref={containerRef}
          onClick={() => xtermRef.current?.focus()}
          className="w-full h-full p-2 bg-[#060911] cursor-text"
        />
      </div>

      {/* Interactive Command Input Bar */}
      <div className="p-3 bg-[#0A0E17] border-t border-[#1E293B] flex items-center gap-2 px-4 flex-shrink-0">
        <div className="flex items-center gap-1.5 text-xs font-mono text-cyan-400 font-bold shrink-0">
          <span>devdock ({activeWorkspace?.name || 'main'}) &gt;</span>
        </div>

        <input
          type="text"
          value={cliInput}
          onChange={(e) => setCliInput(e.target.value)}
          onKeyDown={handleInputKeyDown}
          disabled={isProcessing}
          placeholder="Nhập lệnh slash (/plan, /commit, /git) hoặc câu hỏi lập trình (Enter để chạy, ↑↓ lịch sử)..."
          className="flex-1 bg-[#060911] border border-[#1E2A44] rounded-lg px-3 py-2 text-xs font-mono text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500 selectable disabled:opacity-50"
        />

        <button
          type="button"
          onClick={() => executeCliCommand(cliInput)}
          disabled={isProcessing || !cliInput.trim()}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs cursor-pointer transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {isProcessing ? (
            <>
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              <span>Đang xử lý...</span>
            </>
          ) : (
            <>
              <CornerDownLeft className="w-3.5 h-3.5" />
              <span>Chạy (Enter)</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
