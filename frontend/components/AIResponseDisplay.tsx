import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface AIResponseDisplayProps {
  text: string;
}

export default function AIResponseDisplay({ text }: AIResponseDisplayProps) {
  return (
    <div className="prose prose-xs max-w-none text-slate-700 prose-headings:font-bold prose-headings:text-slate-800 prose-a:text-indigo-600 prose-strong:text-slate-900">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>
        {text}
      </ReactMarkdown>
    </div>
  );
}
