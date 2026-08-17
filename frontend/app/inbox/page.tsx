'use client';

import React, { useState, useEffect, useRef } from 'react';
import api from '../../lib/api';
import {
  Search,
  SlidersHorizontal,


  Bot,
  Send,
  Star,
  Archive,
  MoreVertical,
  Plus,
  X,
  Check,
  User,
  ShoppingBag,
  Clock,
  Sparkles,
  Inbox
} from 'lucide-react';
import { InstagramIcon, FacebookIcon } from '../../components/SocialIcons';

interface Customer {
  _id: string;
  name: string;
  username: string;
  avatar: string;
  channel: 'instagram' | 'facebook';
  lastInteraction: string;
  conversationsCount: number;
  purchasesCount: number;
  tags: string[];
  notes: string;
  city: string;
}

interface Conversation {
  _id: string;
  customerId: Customer;
  channel: 'instagram' | 'facebook';
  status: 'open' | 'closed' | 'pending';
  unread: boolean;
  lastMessageText: string;
  lastMessageTime: string;
}

interface Message {
  _id: string;
  conversationId: string;
  sender: 'customer' | 'user' | 'system';
  text: string;
  mediaUrl?: string;
  aiSuggested?: boolean;
  createdAt: string;
}

export default function InboxPage() {
  // States
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConv, setActiveConv] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [activeTab, setActiveTab] = useState<'all' | 'unread' | 'instagram' | 'facebook'>('all');
  const [search, setSearch] = useState('');
  const [text, setText] = useState('');
  const [loadingList, setLoadingList] = useState(true);
  const [loadingChat, setLoadingChat] = useState(false);
  
  // AI Suggestions States
  const [aiSuggestedText, setAiSuggestedText] = useState('');
  const [loadingAi, setLoadingAi] = useState(false);
  const [showAiBox, setShowAiBox] = useState(false);

  // Customer Sidebar Edit States
  const [customerTags, setCustomerTags] = useState<string[]>([]);
  const [newTagInput, setNewTagInput] = useState('');
  const [customerNotes, setCustomerNotes] = useState('');
  const [savingNotes, setSavingNotes] = useState(false);
  const [customerCity, setCustomerCity] = useState('');
  const [isEditingCity, setIsEditingCity] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Select a conversation and load messages
  const selectConversation = async (conv: Conversation) => {
    setActiveConv(conv);
    setLoadingChat(true);
    setShowAiBox(false);
    setAiSuggestedText('');
    
    // Set customer details in sidebar states
    const cust = conv.customerId;
    setCustomerTags(cust.tags || []);
    setCustomerNotes(cust.notes || '');
    setCustomerCity(cust.city || 'Montevideo');
    setIsEditingCity(false);

    try {
      const res = await api.get(`/conversations/${conv._id}`);
      setMessages(res.data.messages);
      
      // Mark it read locally in list
      setConversations(prev =>
        prev.map(c => (c._id === conv._id ? { ...c, unread: false } : c))
      );
    } catch (err) {
      console.error('Error loading chat messages:', err);
    } finally {
      setLoadingChat(false);
    }
  };

  // Fetch Conversations list
  const fetchConversations = async () => {
    try {
      let url = '/conversations?';
      if (activeTab === 'unread') url += 'unread=true&';
      else if (activeTab === 'instagram') url += 'channel=instagram&';
      else if (activeTab === 'facebook') url += 'channel=facebook&';

      if (search) url += `search=${search}&`;

      const res = await api.get(url);
      setConversations(res.data);
      
      // If we don't have an active conversation, select the first one
      if (res.data.length > 0 && !activeConv) {
        selectConversation(res.data[0]);
      }
    } catch (err) {
      console.error('Error fetching conversations:', err);
    } finally {
      setLoadingList(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchConversations();
    }, 0);
    return () => clearTimeout(timer);
  }, [activeTab, search]);

  // Scroll to bottom of chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Send message
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeConv || !text.trim()) return;

    const messageText = text.trim();
    setText('');
    
    // Optimistic message add
    const tempMsg: Message = {
      _id: Math.random().toString(),
      conversationId: activeConv._id,
      sender: 'user',
      text: messageText,
      createdAt: new Date().toISOString(),
    };
    setMessages(prev => [...prev, tempMsg]);

    try {
      await api.post(`/conversations/${activeConv._id}/messages`, {
        text: messageText,
      });
      
      // Update list last message
      setConversations(prev =>
        prev.map(c =>
          c._id === activeConv._id
            ? { ...c, lastMessageText: messageText, lastMessageTime: new Date().toISOString() }
            : c
        )
      );
    } catch (err) {
      console.error('Error sending message:', err);
    }
  };

  // Generate Suggested Response with Gemini
  const handleGenerateAiResponse = async () => {
    if (!activeConv) return;
    setLoadingAi(true);
    setShowAiBox(true);
    setAiSuggestedText('');
    try {
      const res = await api.post('/ai/suggest-response', {
        conversationId: activeConv._id,
      });
      setAiSuggestedText(res.data.suggestion);
    } catch (err) {
      setAiSuggestedText('Error al conectar con Gemini. Por favor intenta de nuevo.');
      console.error(err);
    } finally {
      setLoadingAi(false);
    }
  };

  // Tag manipulation
  const handleAddTag = async () => {
    if (!activeConv || !newTagInput.trim()) return;
    const newTag = newTagInput.trim();
    const updatedTags = [...customerTags, newTag];
    setCustomerTags(updatedTags);
    setNewTagInput('');

    try {
      await api.put(`/customers/${activeConv.customerId._id}`, {
        tags: updatedTags,
      });
      // Update local customer in active conversation and conversation list
      setActiveConv(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          customerId: { ...prev.customerId, tags: updatedTags }
        };
      });
      setConversations(prev =>
        prev.map(c =>
          c._id === activeConv._id
            ? { ...c, customerId: { ...c.customerId, tags: updatedTags } }
            : c
        )
      );
    } catch (err) {
      console.error('Error adding customer tag:', err);
    }
  };

  const handleRemoveTag = async (tagToRemove: string) => {
    if (!activeConv) return;
    const updatedTags = customerTags.filter(t => t !== tagToRemove);
    setCustomerTags(updatedTags);

    try {
      await api.put(`/customers/${activeConv.customerId._id}`, {
        tags: updatedTags,
      });
      setActiveConv(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          customerId: { ...prev.customerId, tags: updatedTags }
        };
      });
      setConversations(prev =>
        prev.map(c =>
          c._id === activeConv._id
            ? { ...c, customerId: { ...c.customerId, tags: updatedTags } }
            : c
        )
      );
    } catch (err) {
      console.error('Error removing tag:', err);
    }
  };

  // Save notes
  const handleSaveNotes = async () => {
    if (!activeConv) return;
    setSavingNotes(true);
    try {
      await api.put(`/customers/${activeConv.customerId._id}`, {
        notes: customerNotes,
      });
      setActiveConv(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          customerId: { ...prev.customerId, notes: customerNotes }
        };
      });
      setConversations(prev =>
        prev.map(c =>
          c._id === activeConv._id
            ? { ...c, customerId: { ...c.customerId, notes: customerNotes } }
            : c
        )
      );
    } catch (err) {
      console.error('Error saving notes:', err);
    } finally {
      setSavingNotes(false);
    }
  };

  // Save city
  const handleSaveCity = async () => {
    if (!activeConv) return;
    setIsEditingCity(false);
    try {
      await api.put(`/customers/${activeConv.customerId._id}`, {
        city: customerCity,
      });
      setActiveConv(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          customerId: { ...prev.customerId, city: customerCity }
        };
      });
      setConversations(prev =>
        prev.map(c =>
          c._id === activeConv._id
            ? { ...c, customerId: { ...c.customerId, city: customerCity } }
            : c
        )
      );
    } catch (err) {
      console.error('Error saving city:', err);
    }
  };

  // Helper counters for tabs
  const getTabCounts = (tab: 'all' | 'unread' | 'instagram' | 'facebook') => {
    if (tab === 'all') return conversations.length;
    if (tab === 'unread') return conversations.filter(c => c.unread).length;
    if (tab === 'instagram') return conversations.filter(c => c.channel === 'instagram').length;
    if (tab === 'facebook') return conversations.filter(c => c.channel === 'facebook').length;
    return 0;
  };

  return (
    <div className="flex h-[calc(100vh-4rem)] overflow-hidden bg-slate-50">
      
      {/* COLUMN 1: CONVERSATIONS LIST */}
      <div className="w-80 md:w-96 flex flex-col border-r border-slate-100 bg-white h-full shrink-0">
        <div className="p-4 border-b border-slate-100 space-y-3.5">
          <div>
            <h2 className="text-base font-bold text-slate-800">Inbox</h2>
            <p className="text-[10px] text-slate-400">Todas tus conversaciones en un solo lugar</p>
          </div>

          {/* Search bar */}
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar conversaciones..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-100 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all duration-200"
            />
          </div>
        </div>

        {/* Tab Filters */}
        <div className="flex border-b border-slate-100 px-4 text-xs font-semibold text-slate-400 overflow-x-auto shrink-0 bg-slate-50/50">
          {[
            { id: 'all', label: 'Todas' },
            { id: 'unread', label: 'No leídas' },
            { id: 'instagram', label: 'Instagram' },
            { id: 'facebook', label: 'Facebook' }
          ].map(tab => {
            const isActive = activeTab === tab.id;
            const count = getTabCounts(tab.id as 'all' | 'unread' | 'instagram' | 'facebook');
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as 'all' | 'unread' | 'instagram' | 'facebook')}
                className={`py-3 px-3 border-b-2 -mb-[2px] transition-all whitespace-nowrap flex items-center space-x-1.5 ${
                  isActive
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent hover:text-slate-700'
                }`}
              >
                <span>{tab.label}</span>
                {count > 0 && (
                  <span className={`px-1.5 py-0.5 rounded-full text-[9px] ${
                    isActive ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-500'
                  }`}>{count}</span>
                )}
              </button>
            );
          })}
        </div>

        {/* Conversation list stream */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
          {loadingList ? (
            [1, 2, 3].map(i => (
              <div key={i} className="p-4 flex items-center space-x-3.5 animate-pulse">
                <div className="h-10 w-10 bg-slate-100 rounded-full"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-3.5 w-24 bg-slate-100 rounded"></div>
                  <div className="h-3 w-40 bg-slate-100 rounded"></div>
                </div>
              </div>
            ))
          ) : conversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-8 text-center text-slate-400 h-64 space-y-4">
              <Bot className="h-10 w-10 text-slate-300" />
              <div className="space-y-1">
                <p className="text-xs font-semibold">No hay conversaciones</p>
                <p className="text-[10px]">Las conversaciones de Instagram y Facebook aparecerán acá.</p>
              </div>
            </div>
          ) : (
            conversations.map(conv => {
              const customer = conv.customerId;
              const isSelected = activeConv?._id === conv._id;
              const ChannelIcon = conv.channel === 'instagram' ? InstagramIcon : FacebookIcon;

              return (
                <div
                  key={conv._id}
                  onClick={() => selectConversation(conv)}
                  className={`p-4 flex items-start space-x-3 cursor-pointer hover:bg-slate-50 transition-colors relative ${
                    isSelected ? 'bg-indigo-50/40 border-l-4 border-indigo-600 pl-3' : ''
                  } ${conv.unread ? 'bg-slate-50/50' : ''}`}
                >
                  {/* Avatar */}
                  <div className="relative">
                    <img
                      src={customer.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=150'}
                      alt={customer.name}
                      className="h-10 w-10 rounded-full object-cover border border-slate-100 shadow-sm"
                    />
                    <div className={`absolute -bottom-1.5 -right-1.5 p-0.5 rounded-full bg-white shadow ${
                      conv.channel === 'instagram' ? 'text-pink-500' : 'text-blue-600'
                    }`}>
                      <ChannelIcon className="h-3.5 w-3.5" />
                    </div>
                  </div>

                  {/* Meta text info */}
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex justify-between items-baseline">
                      <h4 className="text-xs font-bold text-slate-800 truncate">{customer.name}</h4>
                      <span className="text-[9px] text-slate-400">
                        {new Date(conv.lastMessageTime).toLocaleTimeString('es-UY', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                    <p className={`text-[11px] truncate ${conv.unread ? 'font-bold text-slate-800' : 'text-slate-400'}`}>
                      {conv.lastMessageText}
                    </p>
                  </div>

                  {/* Unread dot */}
                  {conv.unread && (
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 h-2 w-2 rounded-full bg-indigo-600"></div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* COLUMN 2: ACTIVE CONVERSATION THREAD */}
      <div className="flex-1 flex flex-col h-full bg-slate-50">
        {activeConv ? (
          <>
            {/* Header active contact */}
            <div className="h-16 bg-white border-b border-slate-100 px-6 flex justify-between items-center z-10">
              <div className="flex items-center space-x-3.5">
                <img
                  src={activeConv.customerId.avatar}
                  alt={activeConv.customerId.name}
                  className="h-9 w-9 rounded-full object-cover"
                />
                <div>
                  <h3 className="text-xs font-bold text-slate-800">{activeConv.customerId.name}</h3>
                  <div className="flex items-center space-x-1.5 text-[10px] text-slate-400">
                    <span className="font-medium">{activeConv.customerId.username}</span>
                    <span>•</span>
                    <span className="capitalize">{activeConv.channel}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-2 text-slate-400">
                <button className="p-2 hover:bg-slate-50 hover:text-slate-600 rounded-xl transition-all"><Star className="h-4.5 w-4.5" /></button>
                <button className="p-2 hover:bg-slate-50 hover:text-slate-600 rounded-xl transition-all"><Archive className="h-4.5 w-4.5" /></button>
                <button className="p-2 hover:bg-slate-50 hover:text-slate-600 rounded-xl transition-all"><MoreVertical className="h-4.5 w-4.5" /></button>
              </div>
            </div>

            {/* Message Stream Area */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {loadingChat ? (
                <div className="flex flex-col h-full items-center justify-center space-y-3">
                  <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent"></div>
                  <span className="text-xs text-slate-400">Cargando mensajes...</span>
                </div>
              ) : (
                messages.map((msg) => {
                  const isUser = msg.sender === 'user';
                  return (
                    <div
                      key={msg._id}
                      className={`flex ${isUser ? 'justify-end' : 'justify-start'} items-end space-x-2.5`}
                    >
                      {!isUser && (
                        <img
                          src={activeConv.customerId.avatar}
                          alt="Customer"
                          className="h-7 w-7 rounded-full object-cover mb-1.5"
                        />
                      )}
                      <div className="flex flex-col max-w-[70%] space-y-1">
                        <div
                          className={`px-4 py-2.5 rounded-2xl text-xs leading-relaxed shadow-sm ${
                            isUser
                              ? 'bg-indigo-600 text-white rounded-br-none'
                              : 'bg-white text-slate-800 border border-slate-100 rounded-bl-none'
                          }`}
                        >
                          <p>{msg.text}</p>
                          {msg.aiSuggested && (
                            <span className="text-[9px] block text-indigo-200 mt-1 font-semibold flex items-center space-x-1">
                              <Sparkles className="h-3 w-3 inline mr-0.5" /> Respuesta copilotada por IA
                            </span>
                          )}
                        </div>
                        <span className={`text-[9px] text-slate-400 px-1 ${isUser ? 'text-right' : 'text-left'}`}>
                          {new Date(msg.createdAt).toLocaleTimeString('es-UY', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* AI Suggestion box */}
            {showAiBox && (
              <div className="mx-6 mb-3 p-4 bg-indigo-50 border border-indigo-100 rounded-2xl shadow-sm space-y-3 animate-fade-in z-10">
                <div className="flex items-center justify-between text-indigo-800">
                  <div className="flex items-center space-x-2 text-xs font-bold">
                    <Bot className="h-4.5 w-4.5 text-indigo-600" />
                    <span>Respuesta sugerida por IA</span>
                  </div>
                  <button onClick={() => setShowAiBox(false)} className="text-indigo-400 hover:text-indigo-600">
                    <X className="h-4.5 w-4.5" />
                  </button>
                </div>
                
                {loadingAi ? (
                  <div className="space-y-2 py-1.5">
                    <div className="h-3.5 bg-indigo-200/50 rounded animate-pulse w-3/4"></div>
                    <div className="h-3.5 bg-indigo-200/50 rounded animate-pulse w-1/2"></div>
                  </div>
                ) : (
                  <p className="text-xs text-indigo-950 leading-relaxed italic bg-white/70 p-3 rounded-xl border border-indigo-100/30">
                    {aiSuggestedText}
                  </p>
                )}

                {!loadingAi && (
                  <div className="flex space-x-2">
                    <button
                      onClick={() => {
                        setText(aiSuggestedText);
                        setShowAiBox(false);
                      }}
                      className="px-3 py-1.5 bg-indigo-600 text-white rounded-xl text-xs font-semibold hover:bg-indigo-700 shadow-sm hover:shadow transition-all"
                    >
                      Usar respuesta
                    </button>
                    <button
                      onClick={() => {
                        setText(aiSuggestedText);
                        setShowAiBox(false);
                      }}
                      className="px-3 py-1.5 bg-white border border-indigo-200 text-indigo-600 rounded-xl text-xs font-semibold hover:bg-indigo-50 transition-all"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => setShowAiBox(false)}
                      className="px-3 py-1.5 text-indigo-500 rounded-xl text-xs font-semibold hover:bg-indigo-100/40 transition-all"
                    >
                      Cancelar
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Input area */}
            <div className="bg-white border-t border-slate-100 p-4 flex items-center space-x-3.5 shrink-0 z-10">
              {/* Generate IA Response button */}
              <button
                onClick={handleGenerateAiResponse}
                title="Generar respuesta con Gemini"
                className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl hover:bg-indigo-100/80 transition-all shadow-sm flex items-center space-x-1.5 shrink-0"
              >
                <Bot className="h-5 w-5" />
                <span className="text-xs font-semibold hidden md:inline">Sugerir IA</span>
              </button>

              <form onSubmit={handleSendMessage} className="flex-1 flex space-x-3">
                <input
                  type="text"
                  placeholder="Escribe un mensaje..."
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  className="flex-1 border border-slate-200 px-4 py-2.5 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-slate-50/50 focus:bg-white transition-all"
                />
                <button
                  type="submit"
                  disabled={!text.trim()}
                  className="p-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all shadow-md shadow-indigo-100 disabled:opacity-50 disabled:shadow-none shrink-0"
                >
                  <Send className="h-5.5 w-5.5" />
                </button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-400 space-y-4">
            <Inbox className="h-14 w-14 text-slate-200" />
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-slate-600">No hay conversación activa</h3>
              <p className="text-xs max-w-xs leading-relaxed">Selecciona un hilo del inbox a la izquierda para empezar a gestionar la conversación.</p>
            </div>
          </div>
        )}
      </div>

      {/* COLUMN 3: CUSTOMER SIDEBAR INFO */}
      {activeConv && (
        <aside className="hidden lg:flex w-72 flex-col border-l border-slate-100 bg-white h-full overflow-y-auto p-5 space-y-6 shrink-0">
          {/* Details header */}
          <div className="flex flex-col items-center text-center space-y-3 border-b border-slate-100 pb-5">
            <img
              src={activeConv.customerId.avatar}
              alt="Profile"
              className="h-16 w-16 rounded-full object-cover border border-slate-200 shadow-sm"
            />
            <div>
              <h4 className="text-xs font-bold text-slate-800">{activeConv.customerId.name}</h4>
              <span className="text-[10px] text-slate-400">@{activeConv.customerId.username}</span>
            </div>
            <span className={`px-2 py-0.5 rounded-full text-[9px] font-semibold tracking-wide ${
              activeConv.channel === 'instagram' ? 'bg-pink-50 text-pink-600 border border-pink-100' : 'bg-blue-50 text-blue-600 border border-blue-100'
            }`}>
              {activeConv.channel === 'instagram' ? 'Instagram User' : 'Facebook User'}
            </span>
          </div>

          {/* Info table */}
          <div className="space-y-3.5 text-xs">
            <h5 className="font-bold text-slate-800 text-[10px] uppercase tracking-wider text-slate-400">Información</h5>
            
            {/* City */}
            <div className="flex justify-between items-center">
              <span className="text-slate-400 flex items-center space-x-1.5"><Clock className="h-3.5 w-3.5 text-slate-300" /> <span>Ciudad</span></span>
              {isEditingCity ? (
                <div className="flex items-center space-x-1">
                  <input
                    type="text"
                    value={customerCity}
                    onChange={(e) => setCustomerCity(e.target.value)}
                    className="border border-slate-200 px-1.5 py-0.5 rounded text-[11px] w-24 focus:outline-none focus:border-indigo-500"
                  />
                  <button onClick={handleSaveCity} className="p-0.5 bg-emerald-50 text-emerald-600 rounded hover:bg-emerald-100"><Check className="h-3.5 w-3.5" /></button>
                </div>
              ) : (
                <span onClick={() => setIsEditingCity(true)} className="font-semibold text-slate-700 cursor-pointer hover:underline">
                  {customerCity || 'Montevideo'}
                </span>
              )}
            </div>

            {/* Total conversations */}
            <div className="flex justify-between items-center">
              <span className="text-slate-400 flex items-center space-x-1.5"><User className="h-3.5 w-3.5 text-slate-300" /> <span>Conversaciones</span></span>
              <span className="font-semibold text-slate-700">{activeConv.customerId.conversationsCount || 3}</span>
            </div>

            {/* Total purchases */}
            <div className="flex justify-between items-center">
              <span className="text-slate-400 flex items-center space-x-1.5"><ShoppingBag className="h-3.5 w-3.5 text-slate-300" /> <span>Compras</span></span>
              <span className="font-semibold text-slate-700">{activeConv.customerId.purchasesCount || 0}</span>
            </div>
          </div>

          {/* Tags */}
          <div className="space-y-3.5 border-t border-slate-100 pt-5">
            <h5 className="font-bold text-slate-800 text-[10px] uppercase tracking-wider text-slate-400">Etiquetas</h5>
            <div className="flex flex-wrap gap-1.5">
              {customerTags.map(tag => (
                <span
                  key={tag}
                  className="px-2 py-1 rounded-lg bg-indigo-50 text-indigo-700 font-semibold text-[10px] flex items-center space-x-1 border border-indigo-100"
                >
                  <span>{tag}</span>
                  <button onClick={() => handleRemoveTag(tag)} className="text-indigo-400 hover:text-indigo-600">
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
            {/* Add tag form */}
            <div className="flex items-center space-x-1.5 mt-2">
              <input
                type="text"
                placeholder="Nueva etiqueta..."
                value={newTagInput}
                onChange={(e) => setNewTagInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddTag()}
                className="flex-1 border border-slate-200 px-2 py-1 bg-slate-50 text-[11px] rounded-lg focus:outline-none focus:bg-white focus:border-indigo-500"
              />
              <button
                onClick={handleAddTag}
                className="p-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-lg transition"
              >
                <Plus className="h-4.5 w-4.5" />
              </button>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-3 border-t border-slate-100 pt-5 flex-1 flex flex-col">
            <div className="flex justify-between items-center">
              <h5 className="font-bold text-slate-800 text-[10px] uppercase tracking-wider text-slate-400">Notas</h5>
              <button
                onClick={handleSaveNotes}
                disabled={savingNotes}
                className="text-[10px] font-bold text-indigo-600 hover:text-indigo-700 disabled:opacity-50"
              >
                {savingNotes ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
            <textarea
              placeholder="Agregar nota sobre este cliente..."
              value={customerNotes}
              onChange={(e) => setCustomerNotes(e.target.value)}
              className="w-full flex-1 border border-slate-100 p-2.5 text-xs rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 bg-slate-50/50 focus:bg-white transition resize-none min-h-[120px]"
            />
          </div>
        </aside>
      )}
    </div>
  );
}
