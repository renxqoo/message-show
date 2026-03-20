'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MessageSquare, Clock, ChevronRight, Home, Hash } from 'lucide-react';

interface Conversation {
  conversation_id: string;
  message_count: number;
  first_message: number;
  last_message: number;
  first_content: string;
}

function formatTimestamp(ms: number): string {
  return new Date(ms).toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

export default function HomePage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/conversations')
      .then(res => res.json())
      .then(data => {
        setConversations(data);
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to fetch:', err);
        setLoading(false);
      });
  }, []);

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-white/80 backdrop-blur-sm dark:bg-slate-900/80">
        <div className="container mx-auto flex h-16 items-center px-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-purple-600">
              <MessageSquare className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold">Renx Chat Viewer</h1>
              <p className="text-xs text-muted-foreground">聊天记录查看器</p>
            </div>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              {loading ? '加载中...' : `共 ${conversations.length} 个会话`}
            </span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          {/* Session List */}
          <div className="lg:col-span-1">
            <Card className="h-[calc(100vh-12rem)]">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Hash className="h-5 w-5" />
                  会话列表
                </CardTitle>
                <CardDescription>
                  点击会话查看详情
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <ScrollArea className="h-[calc(100%-80px)]">
                  {loading ? (
                    <div className="flex items-center justify-center h-32 text-muted-foreground">
                      加载中...
                    </div>
                  ) : (
                    <div className="space-y-1 p-3">
                      {conversations.map((conv) => (
                        <Link
                          key={conv.conversation_id}
                          href={`/conversation/${encodeURIComponent(conv.conversation_id)}`}
                          className="block"
                        >
                          <div className="group rounded-lg border p-3 transition-all hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-950/30">
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-medium">
                                  {conv.first_content || '无内容'}
                                </p>
                                <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                                  <MessageSquare className="h-3 w-3" />
                                  <span>{conv.message_count} 条消息</span>
                                </div>
                              </div>
                              <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                            </div>
                            <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
                              <Clock className="h-3 w-3" />
                              <span>{formatTimestamp(conv.last_message)}</span>
                            </div>
                          </div>
                        </Link>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </div>

          {/* Welcome Panel */}
          <div className="lg:col-span-2">
            <Card className="h-[calc(100vh-12rem)]">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Home className="h-5 w-5" />
                  欢迎使用
                </CardTitle>
                <CardDescription>
                  从左侧选择一个会话开始查看
                </CardDescription>
              </CardHeader>
              <CardContent className="flex h-[calc(100%-100px)] items-center justify-center">
                <div className="text-center">
                  <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900/30 dark:to-purple-900/30">
                    <MessageSquare className="h-10 w-10 text-blue-500" />
                  </div>
                  <h2 className="mb-2 text-xl font-semibold">Renx AI 聊天记录</h2>
                  <p className="text-muted-foreground">
                    共有 <span className="font-semibold text-foreground">{conversations.length}</span> 个会话记录
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
