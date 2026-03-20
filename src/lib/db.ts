import Database from 'better-sqlite3';

const DB_PATH = '/Users/wrr/.renx/data.db';

export interface Message {
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

export interface Conversation {
  conversation_id: string;
  message_count: number;
  first_message: number;
  last_message: number;
  first_content: string;
}

export interface ParsedContent {
  text?: string;
  toolCallId?: string;
  function?: {
    name: string;
    arguments: string;
  };
  toolResult?: {
    success: boolean;
    output?: string;
    summary?: string;
    metadata?: unknown;
  };
}

export function getDb() {
  return new Database(DB_PATH, { readonly: true });
}

export function getConversations(): Conversation[] {
  const db = getDb();
  try {
    const stmt = db.prepare(`
      SELECT 
        conversation_id,
        COUNT(*) as message_count,
        MIN(created_at_ms) as first_message,
        MAX(created_at_ms) as last_message,
        MIN(CASE WHEN role = 'user' THEN content_json END) as first_content
      FROM messages
      GROUP BY conversation_id
      ORDER BY last_message DESC
    `);
    const rows = stmt.all() as any[];
    return rows.map(row => ({
      ...row,
      first_content: extractTextContent(row.first_content || '""'),
    }));
  } finally {
    db.close();
  }
}

export function getMessagesByConversation(conversationId: string): Message[] {
  const db = getDb();
  try {
    const stmt = db.prepare(`
      SELECT * FROM messages 
      WHERE conversation_id = ?
      ORDER BY seq ASC
    `);
    return stmt.all(conversationId) as Message[];
  } finally {
    db.close();
  }
}

export function parseContent(contentJson: string): ParsedContent {
  try {
    const parsed = JSON.parse(contentJson);
    if (Array.isArray(parsed)) {
      const textParts = parsed
        .filter((p: any) => p.type === 'text')
        .map((p: any) => p.text)
        .join('');
      
      const toolCall = parsed.find((p: any) => p.type === 'tool_call' || p.type === 'function_call');
      const toolResult = parsed.find((p: any) => p.type === 'tool_result' || p.type === 'tool_use');

      if (toolCall) {
        return {
          toolCallId: toolCall.id,
          function: {
            name: toolCall.name || toolCall.function?.name,
            arguments: typeof toolCall.arguments === 'string' 
              ? toolCall.arguments 
              : JSON.stringify(toolCall.arguments, null, 2),
          },
        };
      }

      if (toolResult) {
        return {
          toolResult: {
            success: toolResult.content?.[0]?.success ?? true,
            output: toolResult.content?.[0]?.output || toolResult.content?.[0]?.content || '',
            summary: toolResult.content?.[0]?.summary,
          },
        };
      }

      return { text: textParts || '' };
    }
    return { text: typeof parsed === 'string' ? parsed : JSON.stringify(parsed, null, 2) };
  } catch {
    return { text: contentJson };
  }
}

export function extractTextContent(contentJson: string | null): string {
  if (!contentJson) return '';
  const parsed = parseContent(contentJson);
  return parsed.text || '';
}

export function formatTimestamp(ms: number): string {
  return new Date(ms).toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}
