import React, { useState, useEffect, useRef } from 'react';
import {
  Bot,
  Send,
  Plus,
  Trash2,
  CheckCircle2,
  XCircle,
  Clock,
  Sparkles,
  FileText,
  Calendar,
  HeartPulse,
  Target,
  ArrowRight,
  ShieldCheck,
  RefreshCw,
  AlertCircle,
  HelpCircle,
  IndianRupee,
} from 'lucide-react';
import { aiService } from '../../services/aiService';
import {
  AIActionResponse,
  AICitation,
  AIConversationListItem,
  ChatMessage,
} from '../../types/ai';

export const SahayAIAssistantView: React.FC = () => {
  const [conversations, setConversations] = useState<AIConversationListItem[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputQuery, setInputQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingConvList, setLoadingConvList] = useState(false);
  const [actionProcessingId, setActionProcessingId] = useState<string | null>(null);
  const [actionSuccessMessage, setActionSuccessMessage] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const loadConversations = async () => {
    setLoadingConvList(true);
    try {
      const list = await aiService.listConversations();
      setConversations(list);
    } catch (err) {
      console.error('Failed to load conversations', err);
    } finally {
      setLoadingConvList(false);
    }
  };

  useEffect(() => {
    loadConversations();
  }, []);

  const selectConversation = async (id: string) => {
    setActiveConversationId(id);
    try {
      const conv = await aiService.getConversation(id);
      setMessages(conv.messages);
    } catch (err) {
      console.error('Failed to load conversation details', err);
    }
  };

  const startNewChat = () => {
    setActiveConversationId(null);
    setMessages([]);
    setInputQuery('');
    setActionSuccessMessage(null);
  };

  const handleDeleteConversation = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await aiService.deleteConversation(id);
      if (activeConversationId === id) {
        startNewChat();
      }
      loadConversations();
    } catch (err) {
      console.error('Failed to delete conversation', err);
    }
  };

  const handleSendMessage = async (queryToSend?: string) => {
    const text = (queryToSend || inputQuery).trim();
    if (!text || loading) return;

    setInputQuery('');
    setActionSuccessMessage(null);

    // Optimistic user message
    const tempUserMsg: ChatMessage = {
      id: 'temp-' + Date.now(),
      role: 'user',
      content: text,
      citations: [],
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempUserMsg]);
    setLoading(true);

    try {
      const assistantMsg = await aiService.sendChatMessage(
        text,
        activeConversationId || undefined
      );
      setMessages((prev) => [...prev, assistantMsg]);
      loadConversations();
    } catch (err) {
      console.error('Failed to send chat message', err);
      const errorMsg: ChatMessage = {
        id: 'err-' + Date.now(),
        role: 'assistant',
        content: '⚠️ I encountered an error retrieving or processing household data. Please try again.',
        citations: [],
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmAction = async (action: AIActionResponse, confirmed: boolean) => {
    setActionProcessingId(action.id);
    try {
      const resp = await aiService.confirmAction(action.id, confirmed);
      // Update local action state
      setMessages((prev) =>
        prev.map((m) => {
          if (m.suggested_action && m.suggested_action.id === action.id) {
            return {
              ...m,
              suggested_action: {
                ...m.suggested_action,
                status: resp.status,
              },
            };
          }
          return m;
        })
      );
      setActionSuccessMessage(resp.message);
    } catch (err: any) {
      console.error('Failed to execute action', err);
      alert(err.response?.data?.detail || 'Failed to execute proposed action');
    } finally {
      setActionProcessingId(null);
    }
  };

  const quickPrompts = [
    { label: 'Lifestyle & Expense Advice', query: 'Where can I reduce expenses and invest less without affecting my daily lifestyle to save for our goals?' },
    { label: 'Income & Budget Advice', query: 'What is our monthly income and savings capacity?' },
    { label: 'Upcoming Bills', query: 'What bills are due this month?' },
    { label: 'Lakshya Goal Run-Rates', query: 'Are our Lakshya savings goals on track?' },
    { label: 'Goal Affordability', query: 'Can we afford to save ₹15,000 for a new savings goal?' },
  ];

  const renderCitationIcon = (sourceType: string) => {
    switch (sourceType) {
      case 'money_profile':
        return <IndianRupee className="w-3.5 h-3.5 text-emerald-600" />;
      case 'document':
        return <FileText className="w-3.5 h-3.5 text-blue-500" />;
      case 'obligation':
        return <Calendar className="w-3.5 h-3.5 text-amber-500" />;
      case 'health':
        return <HeartPulse className="w-3.5 h-3.5 text-rose-500" />;
      case 'goal':
        return <Target className="w-3.5 h-3.5 text-emerald-500" />;
      default:
        return <Sparkles className="w-3.5 h-3.5 text-indigo-500" />;
    }
  };

  return (
    <div className="flex h-[calc(100vh-4.5rem)] bg-slate-50 dark:bg-slate-950">
      {/* Sidebar - Past Conversations */}
      <div className="w-80 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Bot className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <h2 className="font-semibold text-slate-800 dark:text-slate-100 text-sm">
              AI Conversations
            </h2>
          </div>
          <button
            onClick={startNewChat}
            className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 transition-colors"
            title="Start New Chat"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {loadingConvList && (
            <div className="p-4 text-center text-xs text-slate-400">Loading chats...</div>
          )}
          {!loadingConvList && conversations.length === 0 && (
            <div className="p-4 text-center text-xs text-slate-400">
              No conversations yet. Ask Sahay any question about your household!
            </div>
          )}
          {conversations.map((c) => (
            <div
              key={c.id}
              onClick={() => selectConversation(c.id)}
              className={`group flex items-center justify-between p-2.5 rounded-lg text-xs cursor-pointer transition-all ${
                activeConversationId === c.id
                  ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-medium'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60'
              }`}
            >
              <div className="flex items-center space-x-2 truncate">
                <Sparkles className="w-3.5 h-3.5 flex-shrink-0 opacity-60" />
                <span className="truncate">{c.title}</span>
              </div>
              <button
                onClick={(e) => handleDeleteConversation(c.id, e)}
                className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-500 p-1 rounded transition-opacity"
                title="Delete Conversation"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>

        {/* Permission & Privacy Badge */}
        <div className="p-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/70">
          <div className="flex items-center space-x-2 text-[11px] text-slate-500 dark:text-slate-400">
            <ShieldCheck className="w-4 h-4 text-emerald-500 flex-shrink-0" />
            <span>Role-Enforced Household RAG (Zero Private Leaks)</span>
          </div>
        </div>
      </div>

      {/* Main Chat Panel */}
      <div className="flex-1 flex flex-col bg-slate-50 dark:bg-slate-950">
        {/* Chat Header */}
        <div className="px-6 py-3.5 border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center text-white shadow-sm">
              <Bot className="w-4 h-4" />
            </div>
            <div>
              <h1 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center space-x-2">
                <span>Sahay Household AI Assistant</span>
                <span className="px-2 py-0.5 text-[10px] font-medium bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 rounded-full border border-indigo-200 dark:border-indigo-800">
                  Grounded OS Engine
                </span>
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Contextual insights across Vault, Daily Responsibilities, Health Shield, & Lakshya
              </p>
            </div>
          </div>
          <button
            onClick={startNewChat}
            className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Chat</span>
          </button>
        </div>

        {/* Messages Stream */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {messages.length === 0 && (
            <div className="max-w-xl mx-auto mt-12 text-center space-y-6">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-indigo-100 dark:bg-indigo-950/80 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shadow-inner">
                <Bot className="w-8 h-8" />
              </div>
              <div className="space-y-2">
                <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
                  How can I assist your family today?
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
                  I can answer questions regarding upcoming utility bills, family health vitals,
                  insurance policies, or even propose actions to mark bills as paid and track savings.
                </p>
              </div>

              {/* Quick Prompt Cards */}
              <div className="grid grid-cols-2 gap-2.5 text-left pt-2">
                {quickPrompts.map((p, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSendMessage(p.query)}
                    className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl hover:border-indigo-400 dark:hover:border-indigo-600 transition-all text-xs group"
                  >
                    <div className="font-medium text-slate-800 dark:text-slate-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
                      {p.label}
                    </div>
                    <div className="text-[11px] text-slate-500 truncate mt-0.5">{p.query}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {actionSuccessMessage && (
            <div className="max-w-2xl mx-auto p-3 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 rounded-xl flex items-center space-x-2 text-xs text-emerald-700 dark:text-emerald-300">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-500" />
              <span>{actionSuccessMessage}</span>
            </div>
          )}

          {messages.map((m) => (
            <div
              key={m.id}
              className={`flex flex-col ${
                m.role === 'user' ? 'items-end' : 'items-start'
              }`}
            >
              <div
                className={`max-w-2xl rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm ${
                  m.role === 'user'
                    ? 'bg-indigo-600 text-white rounded-br-none'
                    : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 rounded-bl-none'
                }`}
              >
                <div className="whitespace-pre-wrap">{m.content}</div>

                {/* Grounded Citations Pills */}
                {m.citations && m.citations.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 space-y-1.5">
                    <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                      Verified Sources:
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {m.citations.map((c, i) => (
                        <div
                          key={i}
                          title={c.snippet}
                          className="flex items-center space-x-1 px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[11px] text-slate-700 dark:text-slate-200"
                        >
                          {renderCitationIcon(c.source_type)}
                          <span className="font-medium truncate max-w-[160px]">{c.title}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Confirmed AI Action Proposal Box */}
                {m.suggested_action && (
                  <div className="mt-4 p-3.5 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-slate-800 dark:to-slate-800/80 border border-amber-200 dark:border-amber-800/50 rounded-xl space-y-2.5">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center space-x-1.5 font-semibold text-amber-900 dark:text-amber-200">
                        <AlertCircle className="w-4 h-4 text-amber-500" />
                        <span>Proposed Household Action</span>
                      </div>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                          m.suggested_action.status === 'executed'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                            : m.suggested_action.status === 'rejected'
                            ? 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300'
                            : 'bg-amber-200 text-amber-900 dark:bg-amber-900/60 dark:text-amber-200'
                        }`}
                      >
                        {m.suggested_action.status}
                      </span>
                    </div>

                    <p className="text-xs text-slate-700 dark:text-slate-200 leading-snug">
                      {m.suggested_action.confirmation_prompt}
                    </p>

                    {m.suggested_action.status === 'pending' && (
                      <div className="flex items-center space-x-2 pt-1">
                        <button
                          disabled={actionProcessingId === m.suggested_action.id}
                          onClick={() =>
                            handleConfirmAction(m.suggested_action!, true)
                          }
                          className="flex items-center space-x-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-medium shadow-sm transition-colors disabled:opacity-50"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Confirm & Execute</span>
                        </button>
                        <button
                          disabled={actionProcessingId === m.suggested_action.id}
                          onClick={() =>
                            handleConfirmAction(m.suggested_action!, false)
                          }
                          className="px-3 py-1.5 bg-white dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-medium border border-slate-200 dark:border-slate-600 transition-colors disabled:opacity-50"
                        >
                          Dismiss
                        </button>
                      </div>
                    )}

                    {m.suggested_action.status === 'executed' && (
                      <div className="flex items-center space-x-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Action verified and executed successfully.</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
              <span className="text-[10px] text-slate-400 mt-1 px-1">
                {new Date(m.created_at).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            </div>
          ))}

          {loading && (
            <div className="flex items-center space-x-2 text-xs text-slate-400 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 w-fit">
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-indigo-500" />
              <span>Checking household records and formulating reply...</span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="flex items-center space-x-2 max-w-4xl mx-auto"
          >
            <input
              type="text"
              value={inputQuery}
              onChange={(e) => setInputQuery(e.target.value)}
              placeholder="Ask about bills, allergies, goals, or say 'Add bill of 2000 for groceries'..."
              className="flex-1 px-4 py-2.5 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white placeholder-slate-400"
            />
            <button
              type="submit"
              disabled={!inputQuery.trim() || loading}
              className="p-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-sm transition-all disabled:opacity-40"
              title="Send Query"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
export default SahayAIAssistantView;
