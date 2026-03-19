'use client';

import { useState, useRef, useEffect } from 'react';
import { ChatMessage, SourceInfo } from '@/types';
import { sendChatMessage } from '@/lib/api';

interface ChatPanelProps {
  conversationId: string;
  sources: SourceInfo[];
}

export default function ChatPanel({ conversationId, sources }: ChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  }, [messages]);

  // Reset messages when conversation changes
  useEffect(() => {
    setMessages([]);
  }, [conversationId]);

  const handleSend = async () => {
    if (!input.trim() || isStreaming || !conversationId) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsStreaming(true);

    // Add placeholder for AI response
    setMessages(prev => [...prev, { role: 'assistant', content: '' }]);

    try {
      const stream = await sendChatMessage(conversationId, userMessage, true) as ReadableStream;
      const reader = stream.getReader();
      const decoder = new TextDecoder();
      let fullResponse = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6).trim();
            if (data === '[DONE]') continue;
            try {
              const parsed = JSON.parse(data);
              if (parsed.text) {
                fullResponse += parsed.text;
                setMessages(prev => {
                  const updated = [...prev];
                  updated[updated.length - 1] = {
                    role: 'assistant',
                    content: fullResponse,
                  };
                  return updated;
                });
              }
              if (parsed.error) {
                fullResponse = `Error: ${parsed.error}`;
                setMessages(prev => {
                  const updated = [...prev];
                  updated[updated.length - 1] = {
                    role: 'assistant',
                    content: fullResponse,
                  };
                  return updated;
                });
              }
            } catch {
              // skip malformed JSON
            }
          }
        }
      }
    } catch (error) {
      console.error('Chat error:', error);
      setMessages(prev => {
        const updated = [...prev];
        updated[updated.length - 1] = {
          role: 'assistant',
          content: 'Sorry, I encountered an error. Please try again.',
        };
        return updated;
      });
    } finally {
      setIsStreaming(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="chat-panel">
      <div className="chat-header">
        <h3>Follow-up Questions</h3>
        {sources.length > 0 && (
          <span className="chat-source-count">{sources.length} sources</span>
        )}
      </div>

      <div className="chat-messages" ref={messagesContainerRef}>
        {messages.length === 0 && (
          <div className="chat-empty">
            <p>Ask follow-up questions about the briefing.</p>
            <div className="chat-suggestions">
              <button onClick={() => setInput('What are the key risks?')} className="suggestion-btn">
                Key risks?
              </button>
              <button onClick={() => setInput('How does this affect retail investors?')} className="suggestion-btn">
                Impact on investors?
              </button>
              <button onClick={() => setInput('What happened before this?')} className="suggestion-btn">
                Background context?
              </button>
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`chat-bubble ${msg.role}`}>
            <div className="bubble-content">
              {msg.content || (
                <div className="typing-indicator">
                  <span></span><span></span><span></span>
                </div>
              )}
              {msg.role === 'assistant' && isStreaming && i === messages.length - 1 && msg.content && (
                <span className="streaming-cursor">▊</span>
              )}
            </div>
            {msg.role === 'assistant' && msg.content && !isStreaming && (
              <div className="bubble-sources">
                {sources.slice(0, 3).map((s, si) => (
                  <a key={si} href={s.url} target="_blank" rel="noopener noreferrer" className="source-chip">
                    {s.source}
                  </a>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="chat-input-area">
        <textarea
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={conversationId ? "Ask a follow-up question..." : "Generate a briefing first"}
          disabled={!conversationId || isStreaming}
          className="chat-input"
          id="chat-input"
          rows={2}
        />
        <button
          onClick={handleSend}
          disabled={!input.trim() || isStreaming || !conversationId}
          className="chat-send-btn"
          id="chat-send-btn"
        >
          {isStreaming ? '...' : '→'}
        </button>
      </div>
    </div>
  );
}
