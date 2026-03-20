'use client';

import { useEffect, useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { ArrowLeft, Bot, User, Wrench, Cpu, Clock, MessageSquare, ChevronDown, ChevronRight, CheckCircle2, XCircle, Terminal, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Message {
  message_id: string;
  conversation_id: string;
  execution_id: string;
  seq: number;
  step_index: number | null;
  role: string;
  type: string;
  content_json: string;
  reasoning_content: string | null;
  tool_call_id: string | null;
  tool_calls_json: string | null;
  usage_json: string | null;
  metadata_json: string | null;
  created_at_ms: number;
}

interface ToolCall {
  id: string;
  name: string;
  arguments: string;
}

interface ToolResult {
  success: boolean;
  output: string;
  summary?: string;
}

function formatTimestamp(ms: number): string {
  return new Date(ms).toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function formatJson(str: string): string {
  try {
    const parsed = JSON.parse(str);
    return JSON.stringify(parsed, null, 2);
  } catch {
    return str;
  }
}

function parseToolCalls(toolCallsJson: string | null): ToolCall[] {
  if (!toolCallsJson) return [];
  try {
    const parsed = JSON.parse(toolCallsJson);
    if (Array.isArray(parsed)) {
      return parsed.map((tc: any) => ({
        id: tc.id || tc.call_id || '',
        name: tc.function?.name || tc.name || 'unknown',
        arguments: typeof tc.function?.arguments === 'string' 
          ? tc.function.arguments 
          : JSON.stringify(tc.function?.arguments || tc.arguments || {}, null, 2),
      }));
    }
    return [];
  } catch {
    return [];
  }
}

function parseToolResult(contentJson: string): ToolResult | null {
  try {
    const parsed = JSON.parse(contentJson);
    // 处理嵌套的 toolResult 结构
    if (parsed.toolResult) {
      const tr = parsed.toolResult;
      return {
        success: tr.success ?? tr.content?.[0]?.success ?? true,
        output: tr.output || tr.content?.[0]?.output || tr.content?.[0]?.content || '',
        summary: tr.summary || tr.content?.[0]?.summary,
      };
    }
    // 直接是 tool-result 内容
    if (Array.isArray(parsed)) {
      const toolUse = parsed.find((p: any) => p.type === 'tool_result' || p.type === 'tool_use');
      if (toolUse) {
        return {
          success: toolUse.content?.[0]?.success ?? true,
          output: toolUse.content?.[0]?.output || toolUse.content?.[0]?.content || '',
          summary: toolUse.content?.[0]?.summary,
        };
      }
    }
    // 简单字符串输出
    return {
      success: true,
      output: typeof parsed === 'string' ? parsed : JSON.stringify(parsed, null, 2),
    };
  } catch {
    return {
      success: true,
      output: contentJson,
    };
  }
}

function parseTextContent(contentJson: string): string {
  try {
    const parsed = JSON.parse(contentJson);
    if (typeof parsed === 'string') return parsed;
    if (Array.isArray(parsed)) {
      return parsed
        .filter((p: any) => p.type === 'text')
        .map((p: any) => p.text)
        .join('');
    }
    return JSON.stringify(parsed, null, 2);
  } catch {
    return contentJson;
  }
}

function ToolCallCard({ toolCall, result }: { toolCall: ToolCall; result: ToolResult | null }) {
  const [expanded, setExpanded] = useState(true);
  const hasOutput = result && (result.output || result.summary);

  return (
    <div className="my-2 rounded-lg border border-green-200 bg-green-50/50 dark:border-green-800 dark:bg-green-950/20 overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2 px-3 py-2 bg-green-100/50 dark:bg-green-900/30 hover:bg-green-100 dark:hover:bg-green-900/50 transition-colors"
      >
        <Wrench className="h-4 w-4 text-green-600 dark:text-green-400" />
        <span className="font-mono text-sm font-medium text-green-700 dark:text-green-300">
          {toolCall.name}
        </span>
        {hasOutput && (
          expanded ? <ChevronDown className="h-4 w-4 ml-auto text-green-500" /> 
                  : <ChevronRight className="h-4 w-4 ml-auto text-green-500" />
        )}
      </button>

      {/* Arguments */}
      <div className="px-3 py-2 border-t border-green-200/50 dark:border-green-800/50">
        <div className="text-xs text-green-600 dark:text-green-400 mb-1">参数</div>
        <pre className="text-xs font-mono bg-black/5 dark:bg-white/5 rounded p-2 overflow-x-auto whitespace-pre-wrap dark:text-green-200">
          {toolCall.arguments}
        </pre>
      </div>

      {/* Result */}
      {hasOutput && expanded && (
        <div className="px-3 py-2 border-t border-green-200/50 dark:border-green-800/50">
          <div className="flex items-center gap-2 text-xs text-green-600 dark:text-green-400 mb-1">
            {result!.success ? (
              <CheckCircle2 className="h-3 w-3 text-green-500" />
            ) : (
              <XCircle className="h-3 w-3 text-red-500" />
            )}
            <span>结果 {result!.success ? '成功' : '失败'}</span>
          </div>
          {result!.summary && (
            <div className="text-xs text-blue-600 dark:text-blue-400 mb-2 bg-blue-50 dark:bg-blue-950/30 rounded p-2">
              {result!.summary}
            </div>
          )}
          {result!.output && (
            <pre className="text-xs font-mono bg-black/5 dark:bg-white/5 rounded p-2 overflow-x-auto whitespace-pre-wrap max-h-48 dark:text-gray-200">
              {result!.output}
            </pre>
          )}
        </div>
      )}
    </div>
  );
}

function MessageBubble({ message, toolCalls, toolResult }: { 
  message: Message; 
  toolCalls: ToolCall[];
  toolResult: ToolResult | null;
}) {
  const [showThinking, setShowThinking] = useState(false);
  const content = parseTextContent(message.content_json);
  const isUser = message.role === 'user';
  const isTool = message.role === 'tool';
  const isToolCall = message.type === 'tool-call';

  // 如果是 assistant 消息但有 tool_calls_json，需要从 toolResult 中配对
  const effectiveToolCalls = isToolCall ? toolCalls : [];

  if (effectiveToolCalls.length > 0) {
    return (
      <div className="flex justify-start">
        <div className="max-w-[85%]">
          {effectiveToolCalls.map((tc, idx) => (
            <ToolCallCard key={tc.id || idx} toolCall={tc} result={idx === 0 ? toolResult : null} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[80%] rounded-2xl px-4 py-3 ${
        isUser 
          ? 'bg-blue-500 text-white rounded-br-md' 
          : isTool
          ? 'bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700'
          : 'bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-700 rounded-bl-md'
      }`}>
        {/* Header */}
        <div className={`mb-2 flex items-center gap-2 text-xs ${
          isUser ? 'text-blue-100' : 'text-muted-foreground'
        }`}>
          {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
          <span>{isUser ? '用户' : isTool ? '工具' : '助手'}</span>
          {message.type !== 'user' && message.type !== 'assistant-text' && message.type !== 'assistant' && (
            <Badge variant="outline" className="text-xs">
              {message.type}
            </Badge>
          )}
          <span className="opacity-60">{formatTimestamp(message.created_at_ms)}</span>
        </div>

        {/* Content */}
        <div className={`text-sm leading-relaxed ${isUser ? 'text-white' : ''}`}>
          {content && (
            <div className="whitespace-pre-wrap break-words">{content}</div>
          )}
        </div>

        {/* Thinking/Reasoning */}
        {message.reasoning_content && (
          <div className="mt-2">
            <button
              onClick={() => setShowThinking(!showThinking)}
              className={`flex items-center gap-1 text-xs ${isUser ? 'text-blue-200' : 'text-muted-foreground'} hover:opacity-80`}
            >
              <Sparkles className="h-3 w-3" />
              思考过程 {showThinking ? '(隐藏)' : '(查看)'}
              {showThinking ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
            </button>
            {showThinking && (
              <div className="mt-2 p-2 rounded bg-black/10 dark:bg-white/10 text-xs font-mono whitespace-pre-wrap max-h-40 overflow-auto">
                {message.reasoning_content}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function MessageWithTools({ message, prevMessage, nextMessage }: {
  message: Message;
  prevMessage: Message | null;
  nextMessage: Message | null;
}) {
  const toolCalls = parseToolCalls(message.tool_calls_json);
  const toolResult = parseToolResult(message.content_json);

  // 如果是 tool-result 类型的消息但不是紧跟在 tool-call 后面，显示为普通工具消息
  if (message.type === 'tool-result' && message.role === 'tool') {
    return (
      <div className="flex justify-start">
        <div className="max-w-[85%]">
          <ToolCallCard 
            toolCall={{ id: message.tool_call_id || '', name: 'Tool', arguments: '{}' }} 
            result={toolResult}
          />
        </div>
      </div>
    );
  }

  return (
    <MessageBubble 
      message={message} 
      toolCalls={toolCalls} 
      toolResult={toolResult}
    />
  );
}

interface PageProps {
  params: { id: string };
}

export default function ConversationPage({ params }: PageProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const conversationId = decodeURIComponent(params.id);

  useEffect(() => {
    fetch(`/api/conversations/${encodeURIComponent(conversationId)}`)
      .then(res => res.json())
      .then(data => {
        setMessages(data);
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to fetch:', err);
        setLoading(false);
      });
  }, [conversationId]);

  // 预处理：配对工具调用和结果
  const processedMessages = useMemo(() => {
    const result: Message[] = [];
    let i = 0;
    
    while (i < messages.length) {
      const msg = messages[i];
      
      // 如果是带有 tool_calls_json 的 assistant tool-call 消息
      if (msg.type === 'tool-call' && msg.tool_calls_json) {
        result.push(msg);
        i++;
        // 跳过紧跟的 tool-result 消息（将在 MessageBubble 中处理）
        while (i < messages.length && messages[i].type === 'tool-result') {
          i++;
        }
        continue;
      }
      
      // 如果是独立的 tool-result 消息
      if (msg.type === 'tool-result' && msg.role === 'tool') {
        result.push(msg);
        i++;
        continue;
      }
      
      // 其他消息直接添加
      result.push(msg);
      i++;
    }
    
    return result;
  }, [messages]);

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-white/80 backdrop-blur-sm dark:bg-slate-900/80">
        <div className="container mx-auto flex h-16 items-center px-4">
          <Link href="/" className="mr-4">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-purple-600">
              <Bot className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold">会话详情</h1>
              <p className="text-xs text-muted-foreground truncate max-w-md">
                {conversationId}
              </p>
            </div>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <Badge variant="outline" className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {loading ? '加载中...' : `${messages.length} 条消息`}
            </Badge>
          </div>
        </div>
      </header>

      {/* Messages */}
      <main className="container mx-auto px-4 py-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <MessageSquare className="h-5 w-5" />
              对话记录
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[calc(100vh-16rem)]">
              {loading ? (
                <div className="flex h-64 items-center justify-center text-muted-foreground">
                  加载中...
                </div>
              ) : messages.length === 0 ? (
                <div className="flex h-64 items-center justify-center text-muted-foreground">
                  暂无消息
                </div>
              ) : (
                <div className="space-y-4 p-4">
                  {processedMessages.map((message, idx) => (
                    <MessageWithTools
                      key={message.message_id}
                      message={message}
                      prevMessage={idx > 0 ? processedMessages[idx - 1] : null}
                      nextMessage={idx < processedMessages.length - 1 ? processedMessages[idx + 1] : null}
                    />
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
