'use client';

import React, { useState } from 'react';
import api from '../lib/api';
import { Bot, Loader2, Sparkles } from 'lucide-react';

interface BillingAnalyzerProps {
  onAnalyzeSuccess: (analysis: string) => void;
}

export default function BillingAnalyzer({ onAnalyzeSuccess }: BillingAnalyzerProps) {
  const [loading, setLoading] = useState(false);

  const handleAnalyze = async () => {
    setLoading(true);
    try {
      const response = await api.post('/mercadolibre/billing/analyze');
      onAnalyzeSuccess(response.data.analysis);
    } catch (error) {
      console.error('Error analyzing billing data:', error);
      alert('Error al realizar el análisis financiero.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <button 
      onClick={handleAnalyze}
      disabled={loading}
      className="flex items-center gap-2 bg-indigo-50 text-indigo-700 px-4 py-2 rounded-xl text-sm font-semibold hover:bg-indigo-100 transition-colors"
    >
      {loading ? <Loader2 className="animate-spin" size={18} /> : <Bot size={18} />} 
      {loading ? 'Analizando...' : 'Analizar con Gemini'}
    </button>
  );
}
