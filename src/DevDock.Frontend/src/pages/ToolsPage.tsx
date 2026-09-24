import React, { useState } from 'react';
import {
  Wrench,
  Code,
  Key,
  Binary,
  Link2,
  Fingerprint,
  Hash,
  Search,
  Clock,
  Palette,
  FileDiff,
  Send,
  Copy,
  Check,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import { api } from '../services/api';

export type ToolType =
  | 'json'
  | 'jwt'
  | 'base64'
  | 'url'
  | 'uuid'
  | 'hash'
  | 'regex'
  | 'timestamp'
  | 'color'
  | 'diff'
  | 'http'
  | 'ai-explain';

interface ToolsPageProps {
  initialTool?: ToolType;
  onShowToast: (msg: string, type: 'success' | 'error' | 'info') => void;
}

export const ToolsPage: React.FC<ToolsPageProps> = ({ initialTool = 'json', onShowToast }) => {
  const [activeTool, setActiveTool] = useState<ToolType>(initialTool);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    onShowToast('Đã sao chép vào bộ nhớ tạm!', 'success');
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const toolsList = [
    { id: 'json' as ToolType, label: 'Định dạng JSON', icon: Code },
    { id: 'jwt' as ToolType, label: 'Giải mã JWT Token', icon: Key },
    { id: 'base64' as ToolType, label: 'Mã hóa Base64', icon: Binary },
    { id: 'url' as ToolType, label: 'URL Encoder / Decoder', icon: Link2 },
    { id: 'uuid' as ToolType, label: 'Trình tạo UUID v4', icon: Fingerprint },
    { id: 'hash' as ToolType, label: 'Tạo mã băm HASH (MD5/SHA)', icon: Hash },
    { id: 'regex' as ToolType, label: 'Kiểm thử RegEx', icon: Search },
    { id: 'timestamp' as ToolType, label: 'Chuyển đổi Epoch Unix', icon: Clock },
    { id: 'color' as ToolType, label: 'Bảng mã màu RGB / HEX', icon: Palette },
    { id: 'diff' as ToolType, label: 'So sánh văn bản Diff', icon: FileDiff },
    { id: 'http' as ToolType, label: 'Kiểm thử HTTP API Client', icon: Send },
    { id: 'ai-explain' as ToolType, label: 'AI Giải Thích Lỗi', icon: Sparkles },
  ];

  return (
    <div className="flex-1 flex overflow-hidden bg-[#0B0F17] w-full h-full min-h-0">
      {/* Tools Sidebar List */}
      <div className="w-56 border-r border-[#1E293B] bg-[#070A0F] p-3 flex flex-col gap-1 flex-shrink-0 min-h-0">
        <div className="px-2 py-1.5 text-xs font-semibold text-slate-400 uppercase tracking-wider font-mono">
          Tiện ích Lập trình viên
        </div>
        <div className="flex-1 overflow-y-auto min-h-0 flex flex-col gap-0.5">
          {toolsList.map((tool) => {
            const Icon = tool.icon;
            const isActive = activeTool === tool.id;
            return (
              <button
                key={tool.id}
                type="button"
                onClick={() => setActiveTool(tool.id)}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-left transition-colors cursor-pointer ${
                  isActive
                    ? 'bg-emerald-500/15 text-emerald-400 font-semibold border border-emerald-500/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-[#111827]'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-emerald-400' : 'text-slate-400'}`} />
                <span>{tool.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Tool Content Viewport */}
      <div className="flex-1 overflow-y-auto w-full min-h-0 p-4 sm:p-6 pr-2 sm:pr-3">
      <div className="max-w-5xl mx-auto w-full flex flex-col gap-6">
        {activeTool === 'json' && <JsonTool onCopy={copyToClipboard} copiedKey={copiedKey} />}
        {activeTool === 'jwt' && <JwtTool onCopy={copyToClipboard} copiedKey={copiedKey} />}
        {activeTool === 'base64' && <Base64Tool onCopy={copyToClipboard} copiedKey={copiedKey} />}
        {activeTool === 'url' && <UrlTool onCopy={copyToClipboard} copiedKey={copiedKey} />}
        {activeTool === 'uuid' && <UuidTool onCopy={copyToClipboard} copiedKey={copiedKey} />}
        {activeTool === 'hash' && <HashTool onCopy={copyToClipboard} copiedKey={copiedKey} />}
        {activeTool === 'regex' && <RegexTool />}
        {activeTool === 'timestamp' && <TimestampTool onCopy={copyToClipboard} copiedKey={copiedKey} />}
        {activeTool === 'color' && <ColorTool onCopy={copyToClipboard} copiedKey={copiedKey} />}
        {activeTool === 'diff' && <DiffTool />}
        {activeTool === 'http' && <HttpClientTool onCopy={copyToClipboard} copiedKey={copiedKey} />}
        {activeTool === 'ai-explain' && <AiExplainErrorTool onCopy={copyToClipboard} copiedKey={copiedKey} onShowToast={onShowToast} />}
      
      </div>
    </div>
    </div>
  );
};

/* 1. JSON Tool */
const JsonTool: React.FC<{ onCopy: (text: string, key: string) => void; copiedKey: string | null }> = ({
  onCopy,
  copiedKey,
}) => {
  const [input, setInput] = useState('{"name":"DevDock","version":1.0,"features":["git","ssh","term"]}');
  const [output, setOutput] = useState('');
  const [error, setError] = useState<string | null>(null);

  const formatJson = (spaces = 2) => {
    try {
      const parsed = JSON.parse(input);
      setOutput(JSON.stringify(parsed, null, spaces));
      setError(null);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const minifyJson = () => {
    try {
      const parsed = JSON.parse(input);
      setOutput(JSON.stringify(parsed));
      setError(null);
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
          <Code className="w-5 h-5 text-emerald-400" />
          <span>JSON Formatter & Validator</span>
        </h2>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => formatJson(2)}
            className="px-3 py-1.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/30 text-xs font-semibold"
          >
            Format (2 spaces)
          </button>
          <button
            type="button"
            onClick={minifyJson}
            className="px-3 py-1.5 rounded-lg bg-[#111827] hover:bg-[#1E293B] text-slate-300 border border-[#1E293B] text-xs font-medium"
          >
            Minify
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-slate-400">Input JSON</label>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            rows={14}
            className="w-full bg-[#111827] border border-[#1E293B] rounded-lg p-3 text-xs font-mono text-slate-200 focus:outline-none focus:border-emerald-500 resize-none selectable"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium text-slate-400">Formatted Output</label>
            {output && (
              <button
                type="button"
                onClick={() => onCopy(output, 'json-out')}
                className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
              >
                {copiedKey === 'json-out' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>Copy</span>
              </button>
            )}
          </div>
          <textarea
            value={output}
            readOnly
            rows={14}
            className="w-full bg-[#070A0F] border border-[#1E293B] rounded-lg p-3 text-xs font-mono text-emerald-300 focus:outline-none resize-none selectable"
          />
        </div>
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-rose-950/50 border border-rose-800 text-rose-300 text-xs font-mono">
          Syntax Error: {error}
        </div>
      )}
    </div>
  );
};

/* 2. JWT Tool */
const JwtTool: React.FC<{ onCopy: (text: string, key: string) => void; copiedKey: string | null }> = ({
  onCopy,
  copiedKey,
}) => {
  const [token, setToken] = useState(
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkRldkRvY2siLCJpYXQiOjE1MTYyMzkwMjJ9.4zU1k3B2dY7lZ8x9c0'
  );

  let header = '';
  let payload = '';
  let isExpired = false;
  let expDate = '';

  try {
    const parts = token.split('.');
    if (parts.length >= 2) {
      header = JSON.stringify(JSON.parse(atob(parts[0])), null, 2);
      const parsedPayload = JSON.parse(atob(parts[1]));
      payload = JSON.stringify(parsedPayload, null, 2);

      if (parsedPayload.exp) {
        const expTime = parsedPayload.exp * 1000;
        isExpired = Date.now() > expTime;
        expDate = new Date(expTime).toLocaleString();
      }
    }
  } catch { }

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
        <Key className="w-5 h-5 text-emerald-400" />
        <span>JWT Decoder</span>
      </h2>

      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium text-slate-400">Encoded JWT Token</label>
        <textarea
          value={token}
          onChange={(e) => setToken(e.target.value)}
          rows={3}
          className="w-full bg-[#111827] border border-[#1E293B] rounded-lg p-3 text-xs font-mono text-slate-200 focus:outline-none focus:border-emerald-500 resize-none selectable"
        />
      </div>

      {expDate && (
        <div className={`p-2.5 rounded-lg text-xs flex items-center gap-2 border ${
          isExpired ? 'bg-rose-950/40 border-rose-800 text-rose-300' : 'bg-emerald-950/40 border-emerald-800 text-emerald-300'
        }`}>
          <span>Status: {isExpired ? '⚠️ Token Expired' : '✅ Token Valid'}</span>
          <span>(Expires: {expDate})</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-slate-400">Header</label>
          <pre className="bg-[#070A0F] border border-[#1E293B] rounded-lg p-3 text-xs font-mono text-blue-300 min-h-[140px] selectable overflow-auto">
            {header || '// Invalid Header'}
          </pre>
        </div>

        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium text-slate-400">Payload</label>
            {payload && (
              <button
                type="button"
                onClick={() => onCopy(payload, 'jwt-payload')}
                className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
              >
                {copiedKey === 'jwt-payload' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>Copy</span>
              </button>
            )}
          </div>
          <pre className="bg-[#070A0F] border border-[#1E293B] rounded-lg p-3 text-xs font-mono text-emerald-300 min-h-[140px] selectable overflow-auto">
            {payload || '// Invalid Payload'}
          </pre>
        </div>
      </div>
    </div>
  );
};

/* 3. Base64 Tool */
const Base64Tool: React.FC<{ onCopy: (text: string, key: string) => void; copiedKey: string | null }> = ({
  onCopy,
  copiedKey,
}) => {
  const [text, setText] = useState('Hello DevDock!');
  const [base64, setBase64] = useState(btoa('Hello DevDock!'));

  const handleTextChange = (v: string) => {
    setText(v);
    try {
      setBase64(btoa(unescape(encodeURIComponent(v))));
    } catch { }
  };

  const handleBase64Change = (v: string) => {
    setBase64(v);
    try {
      setText(decodeURIComponent(escape(atob(v))));
    } catch { }
  };

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
        <Binary className="w-5 h-5 text-emerald-400" />
        <span>Base64 Encoder / Decoder</span>
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-slate-400">Plain Text</label>
          <textarea
            value={text}
            onChange={(e) => handleTextChange(e.target.value)}
            rows={10}
            className="w-full bg-[#111827] border border-[#1E293B] rounded-lg p-3 text-xs font-mono text-slate-200 focus:outline-none focus:border-emerald-500 resize-none selectable"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium text-slate-400">Base64 String</label>
            <button
              type="button"
              onClick={() => onCopy(base64, 'b64')}
              className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
            >
              {copiedKey === 'b64' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>Copy</span>
            </button>
          </div>
          <textarea
            value={base64}
            onChange={(e) => handleBase64Change(e.target.value)}
            rows={10}
            className="w-full bg-[#070A0F] border border-[#1E293B] rounded-lg p-3 text-xs font-mono text-emerald-300 focus:outline-none resize-none selectable"
          />
        </div>
      </div>
    </div>
  );
};

/* 4. URL Tool */
const UrlTool: React.FC<{ onCopy: (text: string, key: string) => void; copiedKey: string | null }> = ({
  onCopy,
  copiedKey,
}) => {
  const [decoded, setDecoded] = useState('https://localhost:5001/api/search?q=DevDock Windows&sort=desc');
  const [encoded, setEncoded] = useState(encodeURI('https://localhost:5001/api/search?q=DevDock Windows&sort=desc'));

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
        <Link2 className="w-5 h-5 text-emerald-400" />
        <span>URL Encoder / Decoder</span>
      </h2>

      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-slate-400">Decoded URL</label>
          <textarea
            value={decoded}
            onChange={(e) => {
              setDecoded(e.target.value);
              setEncoded(encodeURI(e.target.value));
            }}
            rows={3}
            className="bg-[#111827] border border-[#1E293B] rounded-lg p-3 text-xs font-mono text-slate-200 focus:outline-none focus:border-emerald-500 selectable"
          />
        </div>

        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium text-slate-400">Encoded URL</label>
            <button
              type="button"
              onClick={() => onCopy(encoded, 'url')}
              className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
            >
              {copiedKey === 'url' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>Copy</span>
            </button>
          </div>
          <textarea
            value={encoded}
            onChange={(e) => {
              setEncoded(e.target.value);
              try {
                setDecoded(decodeURI(e.target.value));
              } catch { }
            }}
            rows={3}
            className="bg-[#070A0F] border border-[#1E293B] rounded-lg p-3 text-xs font-mono text-emerald-300 focus:outline-none selectable"
          />
        </div>
      </div>
    </div>
  );
};

/* 5. UUID Tool */
const UuidTool: React.FC<{ onCopy: (text: string, key: string) => void; copiedKey: string | null }> = ({
  onCopy,
  copiedKey,
}) => {
  const [uuids, setUuids] = useState<string[]>([crypto.randomUUID()]);
  const [count, setCount] = useState(5);
  const [uppercase, setUppercase] = useState(false);
  const [hyphens, setHyphens] = useState(true);

  const generate = () => {
    const list: string[] = [];
    for (let i = 0; i < count; i++) {
      let u: string = crypto.randomUUID();
      if (!hyphens) u = u.replace(/-/g, '');
      if (uppercase) u = u.toUpperCase();
      list.push(u);
    }
    setUuids(list);
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
          <Fingerprint className="w-5 h-5 text-emerald-400" />
          <span>UUID v4 Generator</span>
        </h2>
        <button
          type="button"
          onClick={generate}
          className="px-3.5 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-slate-950 text-xs font-semibold rounded-lg"
        >
          Generate
        </button>
      </div>

      <div className="flex items-center gap-4 bg-[#111827] p-3 rounded-lg border border-[#1E293B] text-xs">
        <div className="flex items-center gap-2">
          <label className="text-slate-400">Count:</label>
          <input
            type="number"
            min={1}
            max={50}
            value={count}
            onChange={(e) => setCount(Math.min(50, Math.max(1, parseInt(e.target.value) || 1)))}
            className="w-16 bg-[#0B0F17] border border-[#1E293B] rounded px-2 py-1 text-slate-200 text-center"
          />
        </div>
        <label className="flex items-center gap-1.5 text-slate-300 cursor-pointer">
          <input
            type="checkbox"
            checked={uppercase}
            onChange={(e) => setUppercase(e.target.checked)}
            className="accent-emerald-500"
          />
          <span>Uppercase</span>
        </label>
        <label className="flex items-center gap-1.5 text-slate-300 cursor-pointer">
          <input
            type="checkbox"
            checked={hyphens}
            onChange={(e) => setHyphens(e.target.checked)}
            className="accent-emerald-500"
          />
          <span>Hyphens</span>
        </label>
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between text-xs text-slate-400">
          <span>Results ({uuids.length})</span>
          <button
            type="button"
            onClick={() => onCopy(uuids.join('\n'), 'uuids-all')}
            className="text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
          >
            {copiedKey === 'uuids-all' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            <span>Copy All</span>
          </button>
        </div>

        <div className="bg-[#070A0F] border border-[#1E293B] rounded-lg p-3 flex flex-col gap-1.5 max-h-72 overflow-y-auto font-mono text-xs text-emerald-300 selectable">
          {uuids.map((u, i) => (
            <div key={i} className="flex items-center justify-between hover:bg-slate-900/60 px-2 py-1 rounded">
              <span>{u}</span>
              <button
                type="button"
                onClick={() => onCopy(u, `uuid-${i}`)}
                className="text-slate-500 hover:text-slate-300 p-0.5"
              >
                {copiedKey === `uuid-${i}` ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

/* 6. Hash Tool */
const HashTool: React.FC<{ onCopy: (text: string, key: string) => void; copiedKey: string | null }> = ({
  onCopy,
  copiedKey,
}) => {
  const [input, setInput] = useState('DevDock Command Center');
  const [sha256, setSha256] = useState('');
  const [sha1, setSha1] = useState('');

  const computeHashes = async (str: string) => {
    setInput(str);
    const enc = new TextEncoder();
    const data = enc.encode(str);

    const buf256 = await crypto.subtle.digest('SHA-256', data);
    setSha256(Array.from(new Uint8Array(buf256)).map((b) => b.toString(16).padStart(2, '0')).join(''));

    const buf1 = await crypto.subtle.digest('SHA-1', data);
    setSha1(Array.from(new Uint8Array(buf1)).map((b) => b.toString(16).padStart(2, '0')).join(''));
  };

  React.useEffect(() => {
    computeHashes('DevDock Command Center');
  }, []);

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
        <Hash className="w-5 h-5 text-emerald-400" />
        <span>Cryptographic Hash Generator</span>
      </h2>

      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium text-slate-400">Input String</label>
        <textarea
          value={input}
          onChange={(e) => computeHashes(e.target.value)}
          rows={3}
          className="bg-[#111827] border border-[#1E293B] rounded-lg p-3 text-xs font-mono text-slate-200 focus:outline-none focus:border-emerald-500 selectable"
        />
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>SHA-256</span>
            <button
              type="button"
              onClick={() => onCopy(sha256, 'sha256')}
              className="text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
            >
              {copiedKey === 'sha256' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>Copy</span>
            </button>
          </div>
          <div className="p-2.5 rounded-lg bg-[#070A0F] border border-[#1E293B] text-xs font-mono text-emerald-300 break-all selectable">
            {sha256}
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>SHA-1</span>
            <button
              type="button"
              onClick={() => onCopy(sha1, 'sha1')}
              className="text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
            >
              {copiedKey === 'sha1' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>Copy</span>
            </button>
          </div>
          <div className="p-2.5 rounded-lg bg-[#070A0F] border border-[#1E293B] text-xs font-mono text-blue-300 break-all selectable">
            {sha1}
          </div>
        </div>
      </div>
    </div>
  );
};

/* 7. Regex Tool */
const RegexTool: React.FC = () => {
  const [pattern, setPattern] = useState('\\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Z|a-z]{2,}\\b');
  const [flags, setFlags] = useState('g');
  const [text, setText] = useState('Contact support@devdock.dev or admin@example.com for queries.');

  let matches: string[] = [];
  let error = '';

  try {
    const reg = new RegExp(pattern, flags);
    const m = text.match(reg);
    if (m) matches = Array.from(m);
  } catch (err: any) {
    error = err.message;
  }

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
        <Search className="w-5 h-5 text-emerald-400" />
        <span>Regex Tester</span>
      </h2>

      <div className="grid grid-cols-4 gap-3">
        <div className="col-span-3 flex flex-col gap-1">
          <label className="text-xs font-medium text-slate-400">Regular Expression</label>
          <input
            type="text"
            value={pattern}
            onChange={(e) => setPattern(e.target.value)}
            className="bg-[#111827] border border-[#1E293B] rounded-lg px-3 py-2 text-xs font-mono text-slate-100 focus:outline-none focus:border-emerald-500 selectable"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-slate-400">Flags</label>
          <input
            type="text"
            value={flags}
            onChange={(e) => setFlags(e.target.value)}
            className="bg-[#111827] border border-[#1E293B] rounded-lg px-3 py-2 text-xs font-mono text-slate-100 focus:outline-none focus:border-emerald-500 text-center selectable"
          />
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-slate-400">Test String</label>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={5}
          className="bg-[#111827] border border-[#1E293B] rounded-lg p-3 text-xs font-mono text-slate-200 focus:outline-none focus:border-emerald-500 selectable"
        />
      </div>

      {error ? (
        <div className="p-3 bg-rose-950/40 border border-rose-800 text-rose-300 text-xs font-mono rounded-lg">
          Invalid Regex: {error}
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <span className="text-xs font-medium text-slate-400">Matches ({matches.length})</span>
          <div className="p-3 bg-[#070A0F] border border-[#1E293B] rounded-lg flex flex-wrap gap-2 text-xs font-mono">
            {matches.length === 0 ? (
              <span className="text-slate-600">No matches</span>
            ) : (
              matches.map((m, i) => (
                <span key={i} className="px-2 py-1 rounded bg-emerald-950/60 text-emerald-300 border border-emerald-800 selectable">
                  {m}
                </span>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

/* 8. Timestamp Tool */
const TimestampTool: React.FC<{ onCopy: (text: string, key: string) => void; copiedKey: string | null }> = ({
  onCopy,
  copiedKey,
}) => {
  const [epoch, setEpoch] = useState(Math.floor(Date.now() / 1000).toString());
  const [humanDate, setHumanDate] = useState(new Date().toISOString());

  const handleEpochChange = (val: string) => {
    setEpoch(val);
    const num = parseInt(val);
    if (!isNaN(num)) {
      const ms = val.length > 11 ? num : num * 1000;
      setHumanDate(new Date(ms).toISOString());
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
        <Clock className="w-5 h-5 text-emerald-400" />
        <span>Unix Timestamp Converter</span>
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium text-slate-400">Unix Timestamp (Seconds)</label>
            <button
              type="button"
              onClick={() => handleEpochChange(Math.floor(Date.now() / 1000).toString())}
              className="text-xs text-emerald-400 hover:text-emerald-300"
            >
              Current Time
            </button>
          </div>
          <input
            type="text"
            value={epoch}
            onChange={(e) => handleEpochChange(e.target.value)}
            className="bg-[#111827] border border-[#1E293B] rounded-lg px-3 py-2 text-xs font-mono text-slate-100 focus:outline-none focus:border-emerald-500 selectable"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-slate-400">Human Readable Date (ISO / Local)</label>
          <div className="p-2.5 rounded-lg bg-[#070A0F] border border-[#1E293B] text-xs font-mono text-emerald-300 selectable">
            {humanDate}
          </div>
        </div>
      </div>
    </div>
  );
};

/* 9. Color Tool */
const ColorTool: React.FC<{ onCopy: (text: string, key: string) => void; copiedKey: string | null }> = ({
  onCopy,
  copiedKey,
}) => {
  const [color, setColor] = useState('#10B981');

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
        <Palette className="w-5 h-5 text-emerald-400" />
        <span>Color Picker & Format Converter</span>
      </h2>

      <div className="flex items-center gap-4 bg-[#111827] p-4 rounded-xl border border-[#1E293B]">
        <input
          type="color"
          value={color}
          onChange={(e) => setColor(e.target.value)}
          className="w-14 h-14 rounded-lg bg-transparent border-0 cursor-pointer"
        />
        <div className="flex flex-col gap-1">
          <span className="text-base font-mono font-bold text-slate-100">{color.toUpperCase()}</span>
          <span className="text-xs text-slate-400 font-mono">DevDock Accent Tone</span>
        </div>
      </div>
    </div>
  );
};

/* 10. Text Diff Tool */
const DiffTool: React.FC = () => {
  const [textA, setTextA] = useState('line 1\nold value\nline 3');
  const [textB, setTextB] = useState('line 1\nnew value\nline 3\nline 4');

  const linesA = textA.split('\n');
  const linesB = textB.split('\n');

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
        <FileDiff className="w-5 h-5 text-emerald-400" />
        <span>Text Diff Comparator</span>
      </h2>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-slate-400">Original Text</label>
          <textarea
            value={textA}
            onChange={(e) => setTextA(e.target.value)}
            rows={10}
            className="bg-[#111827] border border-[#1E293B] rounded-lg p-3 text-xs font-mono text-slate-200 focus:outline-none focus:border-emerald-500 selectable"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-slate-400">Modified Text</label>
          <textarea
            value={textB}
            onChange={(e) => setTextB(e.target.value)}
            rows={10}
            className="bg-[#111827] border border-[#1E293B] rounded-lg p-3 text-xs font-mono text-slate-200 focus:outline-none focus:border-emerald-500 selectable"
          />
        </div>
      </div>
    </div>
  );
};

/* 11. HTTP Client Tool */
const HttpClientTool: React.FC<{ onCopy: (text: string, key: string) => void; copiedKey: string | null }> = ({
  onCopy,
  copiedKey,
}) => {
  const [method, setMethod] = useState('GET');
  const [url, setUrl] = useState('https://api.github.com/zen');
  const [body, setBody] = useState('{\n  \n}');
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<any>(null);

  const handleSend = async () => {
    if (!url.trim()) return;
    setLoading(true);
    setResponse(null);
    try {
      const res = await api.executeHttp({
        method,
        url: url.trim(),
        body: method !== 'GET' ? body : undefined,
      });
      setResponse(res);
    } catch (err: any) {
      setResponse({
        statusCode: 0,
        statusText: 'Error',
        durationMs: 0,
        headers: {},
        body: err.message,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
        <Send className="w-5 h-5 text-emerald-400" />
        <span>HTTP Client (CORS-Free Backend Dispatch)</span>
      </h2>

      {/* URL bar */}
      <div className="flex items-center gap-2">
        <select
          value={method}
          onChange={(e) => setMethod(e.target.value)}
          className="bg-[#111827] border border-[#1E293B] rounded-lg px-3 py-2 text-xs font-mono font-bold text-emerald-400 focus:outline-none cursor-pointer"
        >
          <option value="GET">GET</option>
          <option value="POST">POST</option>
          <option value="PUT">PUT</option>
          <option value="DELETE">DELETE</option>
          <option value="PATCH">PATCH</option>
        </select>

        <input
          type="text"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://api.example.com/v1/endpoint"
          className="flex-1 bg-[#111827] border border-[#1E293B] rounded-lg px-3 py-2 text-xs font-mono text-slate-100 focus:outline-none focus:border-emerald-500 selectable"
        />

        <button
          type="button"
          onClick={handleSend}
          disabled={loading}
          className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-slate-950 text-xs font-bold rounded-lg flex items-center gap-1.5 transition-colors"
        >
          {loading ? 'Sending...' : 'Send'}
        </button>
      </div>

      {method !== 'GET' && (
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-slate-400">Request Body (JSON)</label>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={4}
            className="bg-[#111827] border border-[#1E293B] rounded-lg p-3 text-xs font-mono text-slate-200 focus:outline-none focus:border-emerald-500 selectable"
          />
        </div>
      )}

      {/* Response Panel */}
      {response && (
        <div className="flex flex-col gap-2 p-4 bg-[#070A0F] border border-[#1E293B] rounded-xl animate-in fade-in duration-150">
          <div className="flex items-center justify-between border-b border-[#1E293B] pb-2 text-xs font-mono">
            <div className="flex items-center gap-3">
              <span
                className={`px-2 py-0.5 rounded font-bold ${
                  response.statusCode >= 200 && response.statusCode < 300
                    ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                    : 'bg-rose-950 text-rose-400 border border-rose-800'
                }`}
              >
                {response.statusCode} {response.statusText}
              </span>
              <span className="text-slate-400">{response.durationMs} ms</span>
              {response.byteLength > 0 && (
                <span className="text-slate-500">{response.byteLength} bytes</span>
              )}
            </div>

            <button
              type="button"
              onClick={() => onCopy(response.body, 'http-res')}
              className="text-slate-400 hover:text-slate-200 flex items-center gap-1 text-xs"
            >
              {copiedKey === 'http-res' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>Copy</span>
            </button>
          </div>

          <pre className="text-xs font-mono text-slate-300 max-h-72 overflow-auto whitespace-pre-wrap selectable pt-2">
            {response.body}
          </pre>
        </div>
      )}
    </div>
  );
};

/* =========================================================================================
 * AI ERROR EXPLAINER TOOL (H3)
 * ========================================================================================= */
const AiExplainErrorTool: React.FC<{
  onCopy: (text: string, key: string) => void;
  copiedKey: string | null;
  onShowToast: (msg: string, type: 'success' | 'error' | 'info') => void;
}> = ({ onCopy, copiedKey, onShowToast }) => {
  const [errorText, setErrorText] = useState('');
  const [context, setContext] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const handleExplain = async () => {
    if (!errorText.trim()) {
      onShowToast('Vui lòng dán nội dung lỗi cần giải thích', 'error');
      return;
    }
    setLoading(true);
    setResult(null);
    try {
      const res = await api.explainError({
        errorText: errorText.trim(),
        context: context.trim() || undefined,
      });
      if (res.success) {
        setResult(res.message);
      } else {
        onShowToast(res.errorMessage || 'AI không phản hồi. Kiểm tra cấu hình AI trong Cài đặt.', 'error');
      }
    } catch (err: any) {
      onShowToast(err.message || 'Lỗi gọi AI', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-violet-400" />
          AI Giải Thích Lỗi
        </h2>
      </div>
      <p className="text-xs text-slate-400 -mt-2">
        Dán log lỗi / stack trace / output lệnh bị lỗi. AI sẽ giải thích nguyên nhân và gợi ý cách khắc phục bằng tiếng Việt.
      </p>

      <div className="flex flex-col gap-1.5">
        <label className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Bối cảnh (tùy chọn)</label>
        <input
          type="text"
          value={context}
          onChange={(e) => setContext(e.target.value)}
          placeholder="vd: Node.js, .NET, Python, Docker..."
          className="bg-[#070A0F] text-slate-100 placeholder-slate-500 text-xs px-3 py-2 rounded-lg border border-[#1E293B] focus:outline-none focus:border-violet-500/50"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Nội dung lỗi</label>
        <textarea
          value={errorText}
          onChange={(e) => setErrorText(e.target.value)}
          rows={8}
          placeholder="Dán stack trace hoặc thông báo lỗi vào đây..."
          className="bg-[#070A0F] text-slate-100 placeholder-slate-500 text-xs font-mono px-3 py-2 rounded-lg border border-[#1E293B] focus:outline-none focus:border-violet-500/50 resize-y"
        />
      </div>

      <button
        type="button"
        onClick={handleExplain}
        disabled={loading}
        className="self-start flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold bg-violet-500/20 text-violet-300 border border-violet-500/40 hover:bg-violet-500/30 transition-colors cursor-pointer disabled:opacity-50"
      >
        {loading ? <RotateCcw className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
        {loading ? 'Đang phân tích...' : 'Giải thích lỗi'}
      </button>

      {result && (
        <div className="flex flex-col gap-2 p-4 bg-[#070A0F] border border-[#1E293B] rounded-xl animate-in fade-in duration-150">
          <div className="flex items-center justify-between border-b border-[#1E293B] pb-2">
            <span className="text-xs font-semibold text-violet-300 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" /> Kết quả phân tích
            </span>
            <button
              type="button"
              onClick={() => onCopy(result, 'ai-explain-res')}
              className="text-slate-400 hover:text-slate-200 flex items-center gap-1 text-xs cursor-pointer"
            >
              {copiedKey === 'ai-explain-res' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>Copy</span>
            </button>
          </div>
          <pre className="text-xs text-slate-300 max-h-96 overflow-auto whitespace-pre-wrap selectable pt-2 leading-relaxed">
            {result}
          </pre>
        </div>
      )}
    </div>
  );
};
