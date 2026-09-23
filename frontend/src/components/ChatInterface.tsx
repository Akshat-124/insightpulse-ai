import React, { useEffect, useRef, useState } from 'react';
import { Send, Sparkles, Trash2, ArrowRight } from 'lucide-react';
import { ChatMessage } from '../types';
import { MessageBubble } from './MessageBubble';

interface ChatInterfaceProps {
  messages: ChatMessage[];
  onSendMessage: (query: string) => void;
  onClearChat: () => void;
  isLoading: boolean;
  selectedPrompt: string | null;
}

const SAMPLE_QUESTIONS = [
  "Which region generated the highest revenue?",
  "Show monthly sales trends.",
  "Which products are underperforming?",
  "What are the top five customers?",
  "Generate SQL for this analysis.",
  "Detect anomalies in the dataset."
];

export const ChatInterface: React.FC<ChatInterfaceProps> = ({
  messages,
  onSendMessage,
  onClearChat,
  isLoading,
  selectedPrompt,
}) => {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  useEffect(() => {
    if (selectedPrompt) {
      setInput(selectedPrompt);
      inputRef.current?.focus();
    }
  }, [selectedPrompt]);

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!input.trim() || isLoading) return;
    onSendMessage(input.trim());
    setInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', position: 'relative' }}>
      
      {/* Sample Query Suggestions Chips */}
      <div style={{
        padding: '0.8rem 1.4rem',
        borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
        background: 'rgba(255, 255, 255, 0.015)',
        display: 'flex',
        alignItems: 'center',
        gap: '0.6rem',
        overflowX: 'auto',
        whiteSpace: 'nowrap'
      }}>
        <span style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-subtle)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
          <Sparkles size={12} color="#8b5cf6" />
          Example Prompts:
        </span>
        {SAMPLE_QUESTIONS.map((q) => (
          <button
            key={q}
            onClick={() => onSendMessage(q)}
            disabled={isLoading}
            style={{
              background: 'rgba(255, 255, 255, 0.04)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '20px',
              padding: '0.3rem 0.75rem',
              fontSize: '0.74rem',
              color: '#cbd5e1',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.3rem'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.borderColor = 'rgba(99, 102, 241, 0.4)';
              e.currentTarget.style.background = 'rgba(99, 102, 241, 0.1)';
              e.currentTarget.style.color = '#ffffff';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)';
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)';
              e.currentTarget.style.color = '#cbd5e1';
            }}
          >
            {q}
            <ArrowRight size={10} color="#818cf8" />
          </button>
        ))}
      </div>

      {/* Messages Scroll Area */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {messages.length === 0 ? (
          <div style={{ padding: '3.5rem 2rem', textAlign: 'center', maxWidth: '640px', margin: '0 auto' }}>
            <div style={{
              width: '60px',
              height: '60px',
              borderRadius: '16px',
              background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.2) 0%, rgba(139, 92, 246, 0.2) 100%)',
              border: '1px solid rgba(99, 102, 241, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1.2rem auto'
            }}>
              <Sparkles size={28} color="#818cf8" />
            </div>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#f8fafc', marginBottom: '0.5rem' }}>
              Ask anything about your data
            </h2>
            <p style={{ fontSize: '0.86rem', color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: '1.5rem' }}>
              I automatically construct safe DuckDB SQL queries, generate charts, calculate statistical anomalies, and explain analytical reasoning.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.6rem', textAlign: 'left' }}>
              {SAMPLE_QUESTIONS.slice(0, 4).map((q) => (
                <div
                  key={q}
                  onClick={() => onSendMessage(q)}
                  className="glass-card"
                  style={{ padding: '0.75rem 1rem', cursor: 'pointer', fontSize: '0.78rem', color: '#cbd5e1' }}
                >
                  <p style={{ fontWeight: 600, color: '#f8fafc' }}>{q}</p>
                </div>
              ))}
            </div>
          </div>
        ) : (
          messages.map((m) => <MessageBubble key={m.id} message={m} />)
        )}

        {/* Loading Indicator */}
        {isLoading && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.8rem',
            padding: '1.25rem 1.4rem',
            background: 'rgba(15, 23, 42, 0.4)',
            borderBottom: '1px solid rgba(255, 255, 255, 0.05)'
          }}>
            <div style={{
              width: '34px',
              height: '34px',
              borderRadius: '8px',
              background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              animation: 'softPulse 1.5s infinite ease-in-out'
            }}>
              <Sparkles size={18} color="#ffffff" />
            </div>
            <div>
              <p style={{ fontSize: '0.85rem', fontWeight: 600, color: '#f8fafc' }}>
                Analyzing dataset with DuckDB & Groq Engine...
              </p>
              <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                Constructing SQL, verifying variance, and formulating charts
              </p>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Form Bar */}
      <div style={{
        padding: '1rem 1.4rem',
        borderTop: '1px solid var(--border-glass)',
        background: 'rgba(10, 15, 29, 0.95)',
        backdropFilter: 'blur(16px)'
      }}>
        <form onSubmit={handleSubmit} style={{ display: 'flex', gap: '0.7rem', alignItems: 'flex-end' }}>
          <div style={{
            flex: 1,
            position: 'relative',
            background: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '10px',
            padding: '0.5rem 0.8rem',
            display: 'flex',
            alignItems: 'center'
          }}>
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask a question about your data (e.g. 'Show monthly sales trends', 'Which region is highest?')..."
              rows={1}
              style={{
                width: '100%',
                background: 'transparent',
                border: 'none',
                outline: 'none',
                color: '#f8fafc',
                fontSize: '0.88rem',
                fontFamily: 'var(--font-sans)',
                resize: 'none',
                lineHeight: 1.4,
                maxHeight: '120px'
              }}
            />
          </div>

          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="btn-primary"
            style={{ height: '42px', padding: '0 1.2rem' }}
          >
            <Send size={15} />
            <span>Send</span>
          </button>

          {messages.length > 0 && (
            <button
              type="button"
              onClick={onClearChat}
              className="btn-secondary"
              title="Clear conversation"
              style={{ height: '42px', padding: '0 0.8rem' }}
            >
              <Trash2 size={16} color="#94a3b8" />
            </button>
          )}
        </form>
      </div>

    </div>
  );
};
