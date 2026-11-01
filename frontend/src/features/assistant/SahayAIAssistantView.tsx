import React, { useState, useEffect, useRef } from 'react';
import { AboutFeatureButton } from '../../components/common/AboutFeatureButton';
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
  Copy,
  Check,
  User,
  Zap,
  TrendingDown,
  Activity,
  Table as TableIcon,
} from 'lucide-react';
import { aiService } from '../../services/aiService';
import {
  AIActionResponse,
  AICitation,
  AIConversationListItem,
  ChatMessage,
} from '../../types/ai';
import { ChatMarkdownRenderer } from './ChatMarkdownRenderer';

export const SahayAIAssistantView: React.FC = () => {
  const [conversations, setConversations] = useState<AIConversationListItem[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputQuery, setInputQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingConvList, setLoadingConvList] = useState(false);
  const [actionProcessingId, setActionProcessingId] = useState<string | null>(null);
  const [actionSuccessMessage, setActionSuccessMessage] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

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

  const handleCopyMessage = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleSendMessage = async (queryToSend?: string) => {
    const text = (queryToSend || inputQuery).trim();
    if (!text || loading) return;

    setInputQuery('');

    // Append user message optimistically
    const tempUserMsg: ChatMessage = {
      id: `temp-${Date.now()}`,
      role: 'user',
      content: text,
      citations: [],
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempUserMsg]);
    setLoading(true);
    setActionSuccessMessage(null);

    try {
      const resp = await aiService.sendChatMessage(text, activeConversationId || undefined);
      setMessages((prev) => [...prev, resp]);
      loadConversations();
    } catch (err: any) {
      console.error('Failed to get AI response', err);
      const errorMsg: ChatMessage = {
        id: `err-${Date.now()}`,
        role: 'assistant',
        content: 'Sorry, I encountered an error communicating with the household brain. Please check the network connection and try again.',
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
    {
      icon: <AlertCircle className="w-4 h-4 text-rose-600" />,
      label: '🚨 Crisis Emergency Mode (₹5L)',
      query: 'Emergency Mode: We urgently require 5 lakhs rupees for a pandemic medical emergency, but our liquid account does not have that much money. Which saved goals should we take money from, and how should we restore them later?',
    },
    {
      icon: <ShieldCheck className="w-4 h-4 text-indigo-600" />,
      label: 'Explainable Doc Verification',
      query: 'What is the expiry date and coverage of our insurance policies? Provide verified document source, page, and evidence.',
    },
    {
      icon: <IndianRupee className="w-4 h-4 text-emerald-600" />,
      label: 'Monthly Cash Flow Table',
      query: 'Give me our monthly financial overview in a table with income, living expenses, bills, and remaining surplus.',
    },
    {
      icon: <TrendingDown className="w-4 h-4 text-amber-600" />,
      label: 'Where to Reduce Expenses',
      query: 'Where can I reduce expenses or invest less to save for goals without affecting my daily lifestyle?',
    },
    {
      icon: <Target className="w-4 h-4 text-indigo-600" />,
      label: 'Lakshya Goals Progress',
      query: 'Show all my savings goals with target amount, current amount, and progress in a table.',
    },
    {
      icon: <Calendar className="w-4 h-4 text-sky-600" />,
      label: 'Upcoming Bills Table',
      query: 'List all upcoming bills with due dates, amounts, and status in a table.',
    },
    {
      icon: <HeartPulse className="w-4 h-4 text-rose-600" />,
      label: 'Family Health Vitals',
      query: 'Show family health profiles, blood groups, and active medications in a table.',
    },
  ];

  const renderCitationIcon = (sourceType: string) => {
    switch (sourceType) {
      case 'money_profile':
        return <IndianRupee className="w-3.5 h-3.5 text-emerald-600" />;
      case 'document':
        return <FileText className="w-3.5 h-3.5 text-blue-600" />;
      case 'obligation':
        return <Calendar className="w-3.5 h-3.5 text-amber-600" />;
      case 'health':
        return <HeartPulse className="w-3.5 h-3.5 text-rose-600" />;
      case 'goal':
        return <Target className="w-3.5 h-3.5 text-emerald-600" />;
      default:
        return <Sparkles className="w-3.5 h-3.5 text-indigo-600" />;
    }
  };

  return (
    <div className="flex h-[calc(100vh-4.5rem)] bg-slate-50 font-sans text-slate-800">
      {/* Sidebar - Past Conversations */}
      <div className="w-80 border-r border-slate-200 bg-white flex flex-col flex-shrink-0 shadow-xs">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-white">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold border border-indigo-100">
              <Bot className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-bold text-slate-800 text-xs uppercase tracking-wider">
                Chat History
              </h2>
              <span className="text-[11px] text-slate-400">
                {conversations.length} conversation{conversations.length === 1 ? '' : 's'}
              </span>
            </div>
          </div>
          <button
            onClick={startNewChat}
            className="flex items-center space-x-1 px-2.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-sm transition-all"
            title="Start New Chat"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Chat</span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-2.5 space-y-1 bg-slate-50/50">
          {loadingConvList && (
            <div className="p-6 text-center text-xs text-slate-400 animate-pulse">Loading conversations...</div>
          )}
          {!loadingConvList && conversations.length === 0 && (
            <div className="p-6 text-center text-xs text-slate-400 space-y-2">
              <Sparkles className="w-6 h-6 mx-auto text-slate-300" />
              <p className="font-medium text-slate-600">No past conversations.</p>
              <p className="text-[11px] text-slate-400 leading-relaxed">Ask any question to start exploring your household data.</p>
            </div>
          )}
          {conversations.map((c) => (
            <div
              key={c.id}
              onClick={() => selectConversation(c.id)}
              className={`group flex items-center justify-between p-2.5 rounded-xl text-xs cursor-pointer transition-all border ${
                activeConversationId === c.id
                  ? 'bg-indigo-50 text-indigo-800 border-indigo-200 font-semibold shadow-xs'
                  : 'bg-white border-slate-200/60 text-slate-700 hover:bg-slate-100/80 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center space-x-2 truncate">
                <Sparkles className="w-3.5 h-3.5 flex-shrink-0 text-indigo-500 opacity-80" />
                <span className="truncate">{c.title}</span>
              </div>
              <button
                onClick={(e) => handleDeleteConversation(c.id, e)}
                className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-500 p-1 rounded-md transition-opacity"
                title="Delete Conversation"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>

        {/* Permission & Privacy Badge */}
        <div className="p-3 border-t border-slate-200 bg-white">
          <div className="flex items-center space-x-2 text-[11px] text-slate-600">
            <ShieldCheck className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span className="font-medium">Role-Enforced Private Household RAG</span>
          </div>
        </div>
      </div>

      {/* Main Chat Panel */}
      <div className="flex-1 flex flex-col bg-slate-50 overflow-hidden">
        {/* Chat Header */}
        <div className="px-6 py-3.5 border-b border-slate-200 bg-white shadow-xs flex items-center justify-between z-10">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-500 flex items-center justify-center text-white shadow-sm">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-sm font-bold text-slate-900">
                  Sahay Household AI Chatbot
                </h1>
                <span className="inline-flex items-center space-x-1 px-2 py-0.5 text-[10px] font-semibold bg-emerald-50 text-emerald-700 rounded-full border border-emerald-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span>Gemini 3.1 Live</span>
                </span>
                <span className="px-2 py-0.5 text-[10px] font-medium bg-indigo-50 text-indigo-700 rounded-full border border-indigo-200">
                  Visual Tables & Insights
                </span>
              </div>
              <p className="text-[11px] text-slate-500">
                Unified intelligence across Vault, Daily Responsibilities, Health Shield, & Lakshya
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <AboutFeatureButton featureKey="assistant" />
            <button
              onClick={startNewChat}
              className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-300 hover:bg-slate-100 text-slate-700 transition-colors bg-white shadow-xs"
            >
              <Plus className="w-3.5 h-3.5 text-indigo-600" />
              <span>New Thread</span>
            </button>
          </div>
        </div>

        {/* Messages Stream */}
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
          {messages.length === 0 && (
            <div className="max-w-3xl mx-auto mt-6 space-y-6 text-center">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-md shadow-indigo-600/20">
                <Bot className="w-8 h-8" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-bold text-slate-900">
                  Welcome to Sahay AI Chatbot
                </h3>
                <p className="text-xs text-slate-600 max-w-lg mx-auto leading-relaxed">
                  I present clear visual tables, expense optimization breakdowns, and life-admin answers
                  without overwhelming text walls. Ask anything or click a quick prompt below:
                </p>
              </div>

              {/* Quick Prompt Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-left pt-2">
                {quickPrompts.map((p, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSendMessage(p.query)}
                    className="p-3.5 bg-white border border-slate-200 rounded-2xl hover:border-indigo-500 hover:shadow-md transition-all text-xs group flex flex-col justify-between shadow-xs"
                  >
                    <div className="flex items-center space-x-2 mb-1.5">
                      <div className="p-1.5 rounded-lg bg-indigo-50 group-hover:bg-indigo-100 transition-colors">
                        {p.icon}
                      </div>
                      <span className="font-semibold text-slate-900 group-hover:text-indigo-700">
                        {p.label}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed">
                      {p.query}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {actionSuccessMessage && (
            <div className="max-w-3xl mx-auto p-3.5 bg-emerald-50 border border-emerald-300 rounded-2xl flex items-center space-x-2.5 text-xs text-emerald-800 shadow-sm">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-600" />
              <span className="font-medium">{actionSuccessMessage}</span>
            </div>
          )}

          {messages.map((m) => (
            <div key={m.id} className="max-w-4xl mx-auto flex flex-col">
              {m.role === 'user' ? (
                /* User Message Bubble */
                <div className="flex items-start justify-end space-x-2.5 mb-2">
                  <div className="max-w-2xl bg-indigo-600 text-white rounded-2xl rounded-tr-none px-4 py-3 text-xs leading-relaxed shadow-sm">
                    <p className="whitespace-pre-wrap">{m.content}</p>
                    <div className="text-[10px] text-indigo-200 mt-1 text-right">
                      {new Date(m.created_at).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </div>
                  </div>
                  <div className="w-8 h-8 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-xs flex-shrink-0 shadow-xs">
                    <User className="w-4 h-4" />
                  </div>
                </div>
              ) : (
                /* Assistant Message Bubble with Full Visual Light Theme */
                <div className="flex items-start space-x-3 mb-2">
                  <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center flex-shrink-0 shadow-sm mt-0.5">
                    <Bot className="w-4 h-4" />
                  </div>
                  <div className="flex-1 max-w-3xl bg-white border border-slate-200 rounded-2xl rounded-tl-none p-5 shadow-sm text-slate-800">
                    {/* Header bar inside assistant bubble */}
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2.5 mb-3">
                      <div className="flex items-center space-x-2">
                        <span className="text-xs font-bold text-slate-900">
                          Sahay AI Assistant
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {new Date(m.created_at).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                      <button
                        onClick={() => handleCopyMessage(m.id, m.content)}
                        className="flex items-center space-x-1 text-[11px] text-slate-500 hover:text-indigo-600 px-2 py-0.5 rounded transition-colors"
                        title="Copy Response"
                      >
                        {copiedId === m.id ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                            <span className="text-emerald-600 font-medium">Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>Copy</span>
                          </>
                        )}
                      </button>
                    </div>

                    {/* Rich Visual Markdown Renderer (Tables, Badges, Metrics) */}
                    <ChatMarkdownRenderer content={m.content} />

                    {/* Grounded Citations & Explainable Document Evidence */}
                    {m.citations && m.citations.length > 0 && (
                      <div className="mt-4 pt-3 border-t border-slate-100 space-y-2">
                        <div className="flex items-center space-x-1.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                          <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />
                          <span>Explainable Document Grounding & Citations:</span>
                        </div>

                        <div className="space-y-2">
                          {m.citations.map((c, i) => {
                            const isDocWithEvidence =
                              c.source_type === 'document' &&
                              (c.evidence || c.page_number || c.file_name);

                            if (isDocWithEvidence) {
                              return (
                                <div
                                  key={i}
                                  className="p-3 bg-indigo-50/50 border border-indigo-100 rounded-xl space-y-1.5 text-xs text-slate-800"
                                >
                                  <div className="flex flex-wrap items-center justify-between gap-1.5">
                                    <div className="flex items-center space-x-1.5 font-semibold text-indigo-900">
                                      <FileText className="w-3.5 h-3.5 text-indigo-600 flex-shrink-0" />
                                      <span className="truncate max-w-[260px]">
                                        Source: {c.file_name || c.title}
                                      </span>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                      {c.page_number && (
                                        <span className="px-2 py-0.5 bg-white border border-indigo-200 rounded text-[10px] font-bold text-indigo-700">
                                          Page: {c.page_number}
                                        </span>
                                      )}
                                      <span className="px-2 py-0.5 bg-emerald-50 border border-emerald-200 rounded text-[10px] font-bold text-emerald-700">
                                        Confidence: {Math.round((c.confidence_score ?? 0.95) * 100)}%
                                      </span>
                                    </div>
                                  </div>
                                  {c.evidence && (
                                    <div className="p-2 bg-white rounded-lg border border-indigo-100 text-[11px] text-slate-700 flex items-start space-x-1.5">
                                      <span className="font-semibold text-indigo-700 flex-shrink-0">
                                        Evidence:
                                      </span>
                                      <span className="italic text-slate-800 font-mono bg-amber-50/60 px-1 rounded border border-amber-200/50">
                                        "{c.evidence}"
                                      </span>
                                    </div>
                                  )}
                                </div>
                              );
                            }

                            return (
                              <div
                                key={i}
                                title={c.snippet}
                                className="inline-flex items-center space-x-1.5 px-2.5 py-1 mr-1.5 rounded-lg bg-slate-50 border border-slate-200 text-[11px] text-slate-700 hover:border-indigo-400 transition-colors cursor-help"
                              >
                                {renderCitationIcon(c.source_type)}
                                <span className="font-semibold truncate max-w-[200px]">{c.title}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Confirmed AI Action Proposal Box */}
                    {m.suggested_action && (
                      <div className="mt-4 p-4 bg-amber-50/70 border border-amber-300 rounded-xl space-y-2.5 shadow-xs">
                        <div className="flex items-center justify-between text-xs">
                          <div className="flex items-center space-x-1.5 font-bold text-amber-900">
                            <AlertCircle className="w-4 h-4 text-amber-600" />
                            <span>Proposed Household Action</span>
                          </div>
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                              m.suggested_action.status === 'executed'
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                : m.suggested_action.status === 'rejected'
                                ? 'bg-slate-200 text-slate-700'
                                : 'bg-amber-200 text-amber-900 border border-amber-300'
                            }`}
                          >
                            {m.suggested_action.status}
                          </span>
                        </div>

                        <p className="text-xs text-slate-800 leading-snug font-medium">
                          {m.suggested_action.confirmation_prompt}
                        </p>

                        {m.suggested_action.status === 'pending' && (
                          <div className="flex items-center space-x-2 pt-1">
                            <button
                              disabled={actionProcessingId === m.suggested_action.id}
                              onClick={() =>
                                handleConfirmAction(m.suggested_action!, true)
                              }
                              className="flex items-center space-x-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-all disabled:opacity-50"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Confirm & Execute</span>
                            </button>
                            <button
                              disabled={actionProcessingId === m.suggested_action.id}
                              onClick={() =>
                                handleConfirmAction(m.suggested_action!, false)
                              }
                              className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-medium border border-slate-300 transition-colors disabled:opacity-50"
                            >
                              Dismiss
                            </button>
                          </div>
                        )}

                        {m.suggested_action.status === 'executed' && (
                          <div className="flex items-center space-x-1.5 text-xs text-emerald-700 font-semibold">
                            <CheckCircle2 className="w-4 h-4" />
                            <span>Action verified and executed successfully in database.</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}

          {loading && (
            <div className="max-w-4xl mx-auto flex items-start space-x-3">
              <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center flex-shrink-0 shadow-sm animate-pulse">
                <Bot className="w-4 h-4" />
              </div>
              <div className="bg-white border border-slate-200 rounded-2xl rounded-tl-none px-4 py-3 shadow-sm flex items-center space-x-2.5 text-xs text-slate-600">
                <RefreshCw className="w-4 h-4 animate-spin text-indigo-600" />
                <span>Checking verified household records & formatting visual tables...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Floating Quick Action Pills */}
        <div className="px-6 py-2.5 bg-white border-t border-slate-200">
          <div className="max-w-4xl mx-auto flex items-center space-x-2 overflow-x-auto no-scrollbar py-0.5">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex-shrink-0">
              Quick Visuals:
            </span>
            {quickPrompts.map((p, idx) => (
              <button
                key={idx}
                onClick={() => handleSendMessage(p.query)}
                className="flex items-center space-x-1.5 px-3 py-1 rounded-full bg-slate-50 border border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/50 hover:text-indigo-700 text-[11px] text-slate-700 whitespace-nowrap shadow-xs transition-all"
              >
                {p.icon}
                <span className="font-semibold">{p.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Input Bar */}
        <div className="p-4 border-t border-slate-200 bg-white">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="flex items-center space-x-2.5 max-w-4xl mx-auto"
          >
            <div className="relative flex-1">
              <input
                type="text"
                value={inputQuery}
                onChange={(e) => setInputQuery(e.target.value)}
                placeholder="Ask about bills, goals, living expenses, or ask 'Where can I save money without affecting my lifestyle?'..."
                className="w-full pl-4 pr-10 py-3 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white text-slate-900 placeholder-slate-400 transition-all shadow-inner"
              />
              <button
                type="button"
                onClick={() => handleSendMessage('Give me our monthly financial overview in a table with income, living expenses, bills, and remaining surplus.')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-indigo-600"
                title="Insert Visual Table Query"
              >
                <TableIcon className="w-4 h-4" />
              </button>
            </div>
            <button
              type="submit"
              disabled={!inputQuery.trim() || loading}
              className="px-4 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-md shadow-indigo-600/20 font-semibold text-xs flex items-center space-x-1.5 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              title="Send Message"
            >
              <span>Send</span>
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
export default SahayAIAssistantView;
