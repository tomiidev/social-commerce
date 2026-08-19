'use client';

import React, { useState, useRef, useEffect } from 'react';
import api from '../../lib/api';
import {
  Bot,
  User,
  Send,
  HelpCircle,
  Sparkles,
  TrendingUp,
  AlertTriangle,
  FileSpreadsheet
} from 'lucide-react';
import AIResponseDisplay from '../../components/AIResponseDisplay';
import AIChatSidebar from '../../components/AIChatSidebar';
import { PREDEFINED_QUESTIONS } from '../../types/ai';

interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  createdAt: string;
}

const getIconForQuestion = (id: number) => {
  switch (id) {
    case 1: return TrendingUp;
    case 2: return AlertTriangle;
    case 3: return FileSpreadsheet;
    case 4: return User;
    case 5: return HelpCircle;
    default: return Sparkles;
  }
};

export default function AIAssistantPage() {
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load messages when conversation changes
  useEffect(() => {
    const fetchConversation = async () => {
      if (selectedConversationId) {
        setLoading(true);
        try {
          const res = await api.get(`/ai/conversations/${selectedConversationId}`);
          // Map backend message format to frontend ChatMessage format
          const formattedMessages = res.data.messages.map((m: any) => ({
            id: Math.random().toString(), // Or use a unique ID from the backend if available
            sender: m.sender,
            text: m.text,
            createdAt: m.createdAt
          }));
          setMessages(formattedMessages);
        } catch (err) {
          console.error('Error fetching conversation:', err);
        } finally {
          setLoading(false);
        }
      } else {
        setMessages([{
          id: 'welcome',
          sender: 'assistant',
          text: '¡Hola! Selecciona una conversación o inicia una nueva para comenzar.',
          createdAt: new Date().toISOString()
        }]);
      }
    };
    fetchConversation();
  }, [selectedConversationId]);

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleCreateConversation = async () => {
    try {
      const res = await api.post('/ai/conversations');
      setSelectedConversationId(res.data._id);
      setMessages([]);
    } catch (err) {
      console.error('Error creating conversation:', err);
    }
  };

  const handleSendMessage = async (textToSend: string, queryType?: string) => {
    if (!textToSend.trim() || loading) return;

    // Si no hay conversación seleccionada, crear una primero
    let conversationId = selectedConversationId;
    if (!conversationId) {
      try {
        const res = await api.post('/ai/conversations');
        conversationId = res.data._id;
        setSelectedConversationId(conversationId);
      } catch (err) {
        console.error('Error creating conversation:', err);
        return;
      }
    }

    const userMessage: ChatMessage = {
      id: Math.random().toString(),
      sender: 'user',
      text: textToSend,
      createdAt: new Date().toISOString()
    };

    const newMessages = [...messages.filter(m => m.id !== 'welcome'), userMessage];
    setMessages(newMessages);
    setInputText('');
    setLoading(true);

    try {
      let assistantReply = '';
      
      if (queryType) {
        // Predefined question flow
        const res = await api.post('/ai/predefined-question', {
          question: textToSend,
          queryType,
          conversationId
        });
        assistantReply = res.data.reply;
      } else {
        // Open chat flow
        const history = newMessages
          .filter(m => m.id !== 'welcome')
          .map(m => ({ sender: m.sender, text: m.text }));
        
        const res = await api.post('/ai/chat', {
          question: textToSend,
          history,
          conversationId
        });
        assistantReply = res.data.reply;
      }

      const assistantMessage: ChatMessage = {
        id: Math.random().toString(),
        sender: 'assistant',
        text: assistantReply,
        createdAt: new Date().toISOString()
      };

      const updatedMessages = [...newMessages, assistantMessage];
      setMessages(updatedMessages);

      // Persist conversation
      await api.put(`/ai/conversations/${conversationId}`, {
        messages: updatedMessages.map(m => ({ sender: m.sender, text: m.text }))
      });

    } catch (err) {
      console.error('Error talking to AI Assistant:', err);
      const errorMessage: ChatMessage = {
        id: Math.random().toString(),
        sender: 'assistant',
        text: 'Disculpame, ocurrió un inconveniente al procesar tu consulta. Por favor, vuelve a intentarlo en un momento.',
        createdAt: new Date().toISOString()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-[calc(100vh-4rem)] overflow-hidden bg-slate-50 w-full">
      <AIChatSidebar 
        onSelectConversation={setSelectedConversationId} 
        selectedId={selectedConversationId}
        onNewConversation={handleCreateConversation}
      />
      {/* MAIN CHAT AREA */}
      <div className="flex-1 flex flex-col h-full bg-slate-50 min-w-0">
        <div className="p-4 border-b border-slate-100 bg-white z-10">
          <h2 className="text-base font-bold text-slate-800">Asistente IA</h2>
          <p className="text-[10px] text-slate-400">Analizá tu tienda con inteligencia artificial impulsada por Gemini</p>
        </div>

        {/* Chat message flow */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5 overflow-x-hidden w-full">
          {messages.map((msg) => {
            const isAI = msg.sender === 'assistant';
            return (
              <div
                key={msg.id}
                className={`flex ${isAI ? 'justify-start' : 'justify-end'} items-start space-x-3 w-full`}
              >
                {isAI && (
                  <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600 shadow-sm shrink-0">
                    <Bot className="h-4.5 w-4.5" />
                  </div>
                )}
                <div className="flex flex-col max-w-[85%] sm:max-w-[75%] space-y-1 overflow-hidden">
                  <div
                    className={`px-4.5 py-3 rounded-2xl shadow-sm text-xs leading-relaxed break-words ${
                      isAI
                        ? 'bg-white text-slate-700 border border-slate-100 rounded-tl-none'
                        : 'bg-indigo-600 text-white rounded-tr-none'
                    }`}
                  >
                    {isAI ? (
                      <AIResponseDisplay text={msg.text} />
                    ) : (
                      <p className="whitespace-pre-wrap">{msg.text}</p>
                    )}
                  </div>
                  <span className={`text-[9px] text-slate-400 px-1 ${isAI ? 'text-left' : 'text-right'}`}>
                    {new Date(msg.createdAt).toLocaleTimeString('es-UY', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
                {!isAI && (
                  <div className="p-2 rounded-xl bg-slate-200 text-slate-600 shrink-0">
                    <User className="h-4.5 w-4.5" />
                  </div>
                )}
              </div>
            );
          })}
          {loading && (
            <div className="flex justify-start items-center space-x-3">
              <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600 shrink-0">
                <Bot className="h-4.5 w-4.5" />
              </div>
              <div className="flex items-center space-x-2 p-3 bg-white border border-slate-100 rounded-2xl shadow-sm">
                <div className="h-2 w-2 rounded-full bg-indigo-400 animate-bounce"></div>
                <div className="h-2 w-2 rounded-full bg-indigo-500 animate-bounce delay-100"></div>
                <div className="h-2 w-2 rounded-full bg-indigo-600 animate-bounce delay-200"></div>
                <span className="text-[10px] font-medium text-slate-400 pl-1">Analizando MongoDB con Gemini...</span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Suggested Questions Slider */}
        <div className="w-full border-t border-slate-100 bg-white min-w-0">
          <div className="flex overflow-x-auto p-4 gap-2 scrollbar-hide w-full">
            {PREDEFINED_QUESTIONS.map((q) => (
              <button
                key={q.id}
                onClick={() => handleSendMessage(q.question, q.queryType)}
                disabled={loading}
                className="whitespace-nowrap px-4 py-2 bg-slate-100 rounded-full text-xs font-medium text-slate-700 hover:bg-indigo-100 hover:text-indigo-700 transition flex-shrink-0"
              >
                {q.question}
              </button>
            ))}
          </div>
        </div>

        {/* Input box */}
        <div className="p-4 bg-white border-t border-slate-100 shrink-0 z-10">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage(inputText);
            }}
            className="flex space-x-3.5"
          >
            <input
              type="text"
              placeholder="Hazle una pregunta al Asistente IA sobre tu negocio..."
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              className="flex-1 border border-slate-200 px-4.5 py-3 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-slate-50/50 focus:bg-white transition"
            />
            <button
              type="submit"
              disabled={!inputText.trim() || loading}
              className="p-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition shadow-md shadow-indigo-150 disabled:opacity-50 disabled:shadow-none"
            >
              <Send className="h-5 w-5" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
