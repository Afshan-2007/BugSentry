import { useState } from 'react';
import {
  Bot,
  Send,
  Loader2,
  Sparkles,
  User,
} from 'lucide-react';
import { askOllama } from '@/lib/ollama';

type Message = {
  role: 'user' | 'assistant';
  content: string;
};

export default function SeekHelpAI() {
  const [question, setQuestion] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);

  async function handleAsk() {
    const trimmedQuestion = question.trim();

    if (!trimmedQuestion || loading) return;

    const userMessage: Message = {
      role: 'user',
      content: trimmedQuestion,
    };

    setMessages((prev) => [...prev, userMessage]);
    setQuestion('');
    setLoading(true);

    try {
      const answer = await askOllama(trimmedQuestion);

      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: answer,
        },
      ]);
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content:
            error instanceof Error
              ? `I couldn't connect to Ollama.\n\n${error.message}`
              : 'I could not connect to Ollama. Make sure Ollama is running.',
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(
    e: React.KeyboardEvent<HTMLTextAreaElement>
  ) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleAsk();
    }
  }

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center">
            <Bot className="w-5 h-5 text-white" />
          </div>

          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              Seek Help from AI
            </h1>

            <p className="text-sm text-slate-500">
              Ask questions and get help while debugging and resolving bugs.
            </p>
          </div>
        </div>
      </div>

      {/* Main AI Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Intro */}
        {messages.length === 0 && (
          <div className="px-6 py-10 border-b border-slate-100">
            <div className="text-center max-w-2xl mx-auto">
              <div className="w-14 h-14 rounded-2xl bg-violet-50 flex items-center justify-center mx-auto mb-4">
                <Sparkles className="w-7 h-7 text-violet-500" />
              </div>

              <h2 className="text-lg font-semibold text-slate-900 mb-2">
                How can I help you?
              </h2>

              <p className="text-sm text-slate-500 leading-6">
                Ask me about errors, debugging, databases, APIs,
                frontend or backend issues, testing, root cause
                analysis, or anything else you need help with.
              </p>

              <div className="flex flex-wrap justify-center gap-2 mt-5">
                {[
                  'How do I debug a foreign key error?',
                  'How should I write a regression test?',
                  'What could cause stale data?',
                  'Explain this error to me',
                ].map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => setQuestion(suggestion)}
                    className="px-3 py-2 text-xs text-slate-600 bg-slate-50 border border-slate-200 rounded-lg hover:bg-violet-50 hover:border-violet-200 hover:text-violet-700 transition"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Conversation */}
        {messages.length > 0 && (
          <div className="px-6 py-6 space-y-6 max-h-[55vh] overflow-y-auto">
            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex gap-3 ${
                  message.role === 'user'
                    ? 'justify-end'
                    : 'justify-start'
                }`}
              >
                {message.role === 'assistant' && (
                  <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-violet-100 flex items-center justify-center">
                    <Bot className="w-4 h-4 text-violet-600" />
                  </div>
                )}

                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-6 whitespace-pre-wrap ${
                    message.role === 'user'
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-50 text-slate-700 border border-slate-200'
                  }`}
                >
                  {message.content}
                </div>

                {message.role === 'user' && (
                  <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-slate-200 flex items-center justify-center">
                    <User className="w-4 h-4 text-slate-600" />
                  </div>
                )}
              </div>
            ))}

            {/* Loading */}
            {loading && (
              <div className="flex gap-3 items-start">
                <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-violet-100 flex items-center justify-center">
                  <Bot className="w-4 h-4 text-violet-600" />
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3">
                  <div className="flex items-center gap-2 text-sm text-slate-500">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    AI is thinking...
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Input */}
        <div className="border-t border-slate-200 p-4 bg-slate-50">
          <div className="flex gap-3 items-end">
            <textarea
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={3}
              placeholder="Ask the AI for help with your bug..."
              className="flex-1 px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm resize-none focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500"
              disabled={loading}
            />

            <button
              type="button"
              onClick={handleAsk}
              disabled={!question.trim() || loading}
              className="flex items-center justify-center gap-2 px-4 py-3 bg-violet-600 text-white text-sm font-medium rounded-xl hover:bg-violet-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}

              Ask
            </button>
          </div>

          <p className="text-xs text-slate-400 mt-2">
            Press Enter to ask · Shift + Enter for a new line
          </p>
        </div>
      </div>
    </div>
  );
}