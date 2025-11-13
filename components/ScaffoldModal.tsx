import React, { useState } from 'react';
import { Idea } from '../types';
import { ClipboardIcon } from './icons/ClipboardIcon';
import { CloseIcon } from './icons/CloseIcon';
import { CheckIcon } from './icons/CheckIcon';

const generatePrompt = (idea: Idea): string => {
  return `**MindVault to AppSmithGPT Hand-off**

**Objective:** Generate a detailed project scaffold for a new micro-app based on the following business idea.

**Target Stack:**
- Frontend: Next.js with TypeScript and Tailwind CSS
- Backend/DB: Supabase (Postgres)
- Deployment: Vercel

**Business Idea Details:**
- **Title:** ${idea.title}
- **Summary:** ${idea.summary}
- **Tags:** ${idea.tags.join(', ')}

**Request:**
Please provide the following project scaffolding assets for a minimal viable product (MVP):
1.  **Core Value Proposition:** Briefly state the primary problem this app solves and for whom.
2.  **Supabase SQL Schema:** Define the necessary tables, columns, types, and relationships. Include RLS policies for basic user data privacy.
3.  **Next.js File Structure:** Outline a logical file and folder structure for pages, components, API routes, and services.
4.  **Core API Routes:** Describe the functionality for at least 3 essential Next.js API routes (e.g., \`POST /api/items\`, \`GET /api/items\`, \`GET /api/user\`).
5.  **Main UI Component:** Provide the JSX/TSX code for the primary dashboard or landing page component, including placeholders for functionality.
6.  **Deployment Checklist:** A concise list of steps to deploy this application on Vercel connected to a Supabase project.`;
};

interface ScaffoldModalProps {
  idea: Idea;
  onClose: () => void;
}

export const ScaffoldModal: React.FC<ScaffoldModalProps> = ({ idea, onClose }) => {
  const [isCopied, setIsCopied] = useState(false);
  const prompt = generatePrompt(idea);

  const handleCopy = () => {
    navigator.clipboard.writeText(prompt);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2500);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4 transition-opacity duration-300">
      <div className="bg-brand-surface rounded-lg shadow-2xl p-6 max-w-2xl w-full text-left relative max-h-[90vh] flex flex-col animate-fade-in-up">
        <div className="flex justify-between items-center mb-4 pb-4 border-b border-gray-700">
          <h2 className="text-xl font-bold text-brand-text">AppSmithGPT Scaffold Prompt</h2>
          <button onClick={onClose} className="text-brand-text-muted hover:text-brand-text transition-colors">
            <CloseIcon />
          </button>
        </div>
        <p className="text-sm text-brand-text-muted mb-4">
          Copy the prompt below and paste it into a powerful LLM (like Gemini or ChatGPT) to generate a project scaffold for your idea.
        </p>
        <div className="bg-brand-bg p-4 rounded-md overflow-y-auto flex-grow border border-gray-700">
          <pre className="text-sm text-brand-text-muted whitespace-pre-wrap font-mono">{prompt}</pre>
        </div>
        <div className="mt-6">
          <button
            onClick={handleCopy}
            disabled={isCopied}
            className="w-full bg-brand-secondary text-white font-bold py-3 px-4 rounded-lg flex items-center justify-center gap-2 hover:bg-emerald-500 disabled:bg-emerald-600 transition-colors"
          >
            {isCopied ? <CheckIcon /> : <ClipboardIcon />}
            {isCopied ? 'Copied to Clipboard!' : 'Copy Prompt'}
          </button>
        </div>
      </div>
    </div>
  );
};
