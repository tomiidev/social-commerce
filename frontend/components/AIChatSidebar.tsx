'use client';

import React, { useState, useEffect } from 'react';
import api from '../lib/api';
import { MessageSquare, Plus, ChevronLeft, ChevronRight } from 'lucide-react';

interface Conversation {
  _id: string;
  title: string;
  updatedAt: string;
}

interface AIChatSidebarProps {
  onSelectConversation: (id: string) => void;
  selectedId: string | null;
  onNewConversation: () => void;
}

export default function AIChatSidebar({ onSelectConversation, selectedId, onNewConversation }: AIChatSidebarProps) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchConversations = async () => {
    try {
      const res = await api.get('/ai/conversations');
      setConversations(res.data);
    } catch (error) {
      console.error('Error fetching AI conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConversations();
  }, []);

  return (
    <div className="w-64 bg-slate-50 border-r border-slate-200 h-full flex flex-col">
      <div className="p-4">
        <button
          onClick={() => {
            onNewConversation();
            fetchConversations();
          }}
          className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 transition-colors"
        >
          <Plus className="h-4 w-4" />
          <span>Nueva Conversación</span>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-2 space-y-1">
        {loading ? (
          <div className="p-4 text-xs text-slate-400">Cargando...</div>
        ) : (
          conversations.map((conv) => (
            <button
              key={conv._id}
              onClick={() => onSelectConversation(conv._id)}
              className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm text-left transition-colors ${
                selectedId === conv._id
                  ? 'bg-white border border-slate-200 shadow-sm text-indigo-600'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <MessageSquare className="h-4 w-4" />
              <span className="truncate flex-1">{conv.title}</span>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
