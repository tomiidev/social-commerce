'use client';

import React, { useState, useRef, useEffect } from 'react';
import api from '../../lib/api';
import {
  Bot,
  User,
  Send,
  HelpCircle,
  Sparkles,
  ArrowRight,
  TrendingUp,
  AlertTriangle,
  RefreshCw
} from 'lucide-react';

interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  createdAt: string;
}

export default function AIAssistantPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      sender: 'assistant',
      text: '¡Hola! Soy tu **Asistente IA de SocialFlow**. Estoy acá para ayudarte a analizar tus datos de venta, catálogo de productos, clientes e interacciones sociales.\n\nPodés elegir una de las preguntas sugeridas de la derecha o hacerme cualquier consulta libre sobre tu negocio. ¿En qué te puedo ayudar hoy?',
      createdAt: new Date().toISOString()
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const suggestedQuestions = [
    { text: '¿Qué productos tienen más demanda?', icon: TrendingUp },
    { text: '¿Qué preguntas hacen más mis clientes?', icon: HelpCircle },
    { text: '¿Qué publicaciones generan más interés?', icon: Sparkles },
    { text: '¿Dónde estoy perdiendo ventas?', icon: AlertTriangle },
    { text: 'Dame un resumen de esta semana.', icon: Bot }
  ];

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (textToSend: string) => {
    if (!textToSend.trim() || loading) return;

    const userMessage: ChatMessage = {
      id: Math.random().toString(),
      sender: 'user',
      text: textToSend,
      createdAt: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setLoading(true);

    try {
      // Map history for API
      const history = messages
        .filter(m => m.id !== 'welcome') // Skip welcome
        .map(m => ({
          sender: m.sender,
          text: m.text
        }));

      const res = await api.post('/ai/chat', {
        question: textToSend,
        history
      });

      const assistantMessage: ChatMessage = {
        id: Math.random().toString(),
        sender: 'assistant',
        text: res.data.reply,
        createdAt: new Date().toISOString()
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (err) {
      console.error('Error talking to AI Assistant:', err);
      const errorMessage: ChatMessage = {
        id: Math.random().toString(),
        sender: 'assistant',
        text: 'Disculpame, ocurrió un inconveniente al procesar tu consulta con Gemini. Por favor, asegúrate de tener configurada tu API key de Gemini o vuelve a intentarlo.',
        createdAt: new Date().toISOString()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const parseMarkdown = (text: string) => {
    // Simple parser for bold strings (**text**) and bullet lists
    const lines = text.split('\n');
    return lines.map((line, idx) => {
      const content = line;
      
      // Bold replacer
      const boldRegex = /\*\*(.*?)\*\*/g;
      const parts = [];
      let lastIndex = 0;
      let match;
      
      while ((match = boldRegex.exec(content)) !== null) {
        if (match.index > lastIndex) {
          parts.push(content.substring(lastIndex, match.index));
        }
        parts.push(<strong key={match.index} className="font-bold text-slate-900">{match[1]}</strong>);
        lastIndex = boldRegex.lastIndex;
      }
      
      if (lastIndex < content.length) {
        parts.push(content.substring(lastIndex));
      }
      
      const isBullet = line.trim().startsWith('*') || line.trim().startsWith('-');
      const isNumList = /^\d+\.\s/.test(line.trim());

      if (isBullet) {
        return (
          <li key={idx} className="ml-4 list-disc pl-1 mb-1 leading-relaxed text-xs">
            {parts.length > 0 ? parts : line.replace(/^[\*\-]\s/, '')}
          </li>
        );
      }
      if (isNumList) {
        return (
          <li key={idx} className="ml-4 list-decimal pl-1 mb-1 leading-relaxed text-xs">
            {parts.length > 0 ? parts : line.replace(/^\d+\.\s/, '')}
          </li>
        );
      }
      
      return (
        <p key={idx} className="mb-2.5 leading-relaxed text-xs whitespace-pre-wrap">
          {parts.length > 0 ? parts : content}
        </p>
      );
    });
  };

  return (
    <div className="flex h-[calc(100vh-4rem)] overflow-hidden bg-slate-50">
      {/* MAIN CHAT AREA */}
      <div className="flex-1 flex flex-col h-full bg-slate-50">
        <div className="p-4 border-b border-slate-100 bg-white z-10">
          <h2 className="text-base font-bold text-slate-800">Asistente IA</h2>
          <p className="text-[10px] text-slate-400">Analizá tu tienda con inteligencia artificial impulsada por Gemini</p>
        </div>

        {/* Chat message flow */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {messages.map((msg) => {
            const isAI = msg.sender === 'assistant';
            return (
              <div
                key={msg.id}
                className={`flex ${isAI ? 'justify-start' : 'justify-end'} items-start space-x-3`}
              >
                {isAI && (
                  <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600 shadow-sm shrink-0">
                    <Bot className="h-4.5 w-4.5" />
                  </div>
                )}
                <div className="flex flex-col max-w-[75%] space-y-1">
                  <div
                    className={`px-4.5 py-3 rounded-2xl shadow-sm text-xs leading-relaxed ${
                      isAI
                        ? 'bg-white text-slate-700 border border-slate-100 rounded-tl-none'
                        : 'bg-indigo-600 text-white rounded-tr-none'
                    }`}
                  >
                    {isAI ? (
                      <div className="space-y-1.5">{parseMarkdown(msg.text)}</div>
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

      {/* SUGGESTED PANEL SIDEBAR */}
      <aside className="hidden lg:flex w-80 flex-col bg-white border-l border-slate-100 h-full p-5 space-y-6 shrink-0">
        <div>
          <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider text-slate-400 mb-2">Sugerencias</h4>
          <p className="text-[10px] text-slate-400 leading-relaxed">Selecciona una de las preguntas sugeridas para iniciar un análisis automático.</p>
        </div>

        <div className="space-y-3">
          {suggestedQuestions.map((q) => {
            const Icon = q.icon;
            return (
              <button
                key={q.text}
                onClick={() => handleSendMessage(q.text)}
                disabled={loading}
                className="w-full text-left p-3.5 bg-slate-50 hover:bg-indigo-50 border border-slate-100 hover:border-indigo-100 rounded-2xl flex items-center space-x-3 group transition-all duration-200 disabled:opacity-50"
              >
                <div className="p-2 rounded-xl bg-white border border-slate-100 text-slate-500 group-hover:text-indigo-600 group-hover:border-indigo-100 transition-colors shadow-sm shrink-0">
                  <Icon className="h-4.5 w-4.5" />
                </div>
                <div className="flex-1 flex justify-between items-center text-xs">
                  <span className="font-semibold text-slate-700 group-hover:text-slate-900 transition-colors">{q.text}</span>
                  <ArrowRight className="h-3.5 w-3.5 text-slate-300 group-hover:text-indigo-600 group-hover:translate-x-0.5 transition-all shrink-0 ml-1.5" />
                </div>
              </button>
            );
          })}
        </div>
      </aside>
    </div>
  );
}
