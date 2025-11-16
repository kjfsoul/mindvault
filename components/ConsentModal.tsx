import React, { useState } from 'react';
import { consentModalText, fullTermsOfService, fullPrivacyPolicy, minimalPrivacyPolicy } from './ComplianceText';
import { CloseIcon } from './icons/CloseIcon';

interface ConsentModalProps {
  onImportAndIndex: () => void;
  onImportLocal: () => void;
  onCancel: () => void;
}

const QuestionMarkCircleIcon: React.FC = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const PolicyModal: React.FC<{ title: string; content: string; onClose: () => void; }> = ({ title, content, onClose }) => (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4 transition-opacity duration-300">
      <div className="bg-brand-surface rounded-lg shadow-2xl p-6 max-w-2xl w-full text-left relative max-h-[90vh] flex flex-col animate-fade-in-up">
        <div className="flex justify-between items-center mb-4 pb-4 border-b border-gray-700">
          <h2 className="text-xl font-bold text-brand-text">{title}</h2>
          <button onClick={onClose} className="text-brand-text-muted hover:text-brand-text transition-colors">
            <CloseIcon />
          </button>
        </div>
        <div className="overflow-y-auto flex-grow prose prose-invert prose-sm max-w-none">
            <pre className="text-sm text-brand-text-muted whitespace-pre-wrap font-sans">{content}</pre>
        </div>
        <div className="mt-6 text-right">
             <button
                onClick={onClose}
                className="bg-gray-600 text-white font-semibold py-2 px-6 rounded-lg hover:bg-gray-500 transition-colors"
              >
                Close
              </button>
        </div>
      </div>
    </div>
);

const ConsentModal: React.FC<ConsentModalProps> = ({ onImportAndIndex, onImportLocal, onCancel }) => {
  const [policyToShow, setPolicyToShow] = useState<'terms' | 'privacy' | null>(null);

  const policyText = minimalPrivacyPolicy.trim().split('\n').slice(2).join('\n').trim();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4 animate-fade-in-up">
      <div className="bg-brand-surface rounded-lg shadow-2xl p-8 max-w-lg w-full mx-4 text-center">
        <h2 className="text-2xl font-bold mb-4">Authorize MindVault</h2>
        <p className="text-brand-text-muted mb-6">
          {consentModalText}
        </p>

        <div className="my-6 text-left bg-brand-bg/50 p-4 rounded-lg border border-gray-700 max-h-40 overflow-y-auto text-sm text-brand-text-muted">
          <h3 className="font-bold text-brand-text mb-2 text-base">Privacy Summary</h3>
          <p className="whitespace-pre-wrap">{policyText}</p>
        </div>

        <div className="flex flex-col space-y-3">
            <div className="relative group">
                <button
                    onClick={onImportAndIndex}
                    className="w-full bg-brand-primary text-white font-bold py-3 px-6 rounded-lg shadow-md hover:bg-indigo-500 transition-all duration-300 flex items-center justify-center"
                >
                    <span>Import & Index (Cloud)</span>
                    <span className="ml-2 text-indigo-200"><QuestionMarkCircleIcon /></span>
                </button>
                <div className="absolute bottom-full mb-2 w-full max-w-xs left-1/2 -translate-x-1/2 bg-brand-bg border border-gray-600 rounded-lg shadow-lg p-3 text-xs text-brand-text-muted z-10 invisible group-hover:visible transition-opacity opacity-0 group-hover:opacity-100">
                    <strong className="text-brand-text">Recommended.</strong> Your data is saved to your secure account, enabling conversation history and access from any device.
                </div>
            </div>
            <div className="relative group">
                 <button
                    onClick={onImportLocal}
                    className="w-full bg-gray-600 text-white font-bold py-3 px-6 rounded-lg shadow-md hover:bg-gray-500 transition-all duration-300 flex items-center justify-center"
                >
                    <span>Import Locally Only</span>
                    <span className="ml-2 text-gray-300"><QuestionMarkCircleIcon /></span>
                </button>
                <div className="absolute bottom-full mb-2 w-full max-w-xs left-1/2 -translate-x-1/2 bg-brand-bg border border-gray-600 rounded-lg shadow-lg p-3 text-xs text-brand-text-muted z-10 invisible group-hover:visible transition-opacity opacity-0 group-hover:opacity-100">
                    <strong className="text-brand-text">Maximum Privacy.</strong> Your data is processed entirely in your browser and never leaves your machine. History will not be saved to your account.
                </div>
            </div>
           <button
            onClick={onCancel}
            className="w-full text-brand-text-muted font-semibold py-2 px-6 rounded-lg hover:bg-white/5 transition-all duration-300"
          >
            Cancel
          </button>
        </div>
        
        <p className="text-xs text-brand-text-muted mt-6">
          By continuing, you agree to our{' '}
          <button onClick={() => setPolicyToShow('terms')} className="underline text-brand-primary/80 hover:text-brand-primary transition-colors">
            Terms of Service
          </button> and acknowledge our{' '}
           <button onClick={() => setPolicyToShow('privacy')} className="underline text-brand-primary/80 hover:text-brand-primary transition-colors">
            Privacy Policy
          </button>.
        </p>
      </div>
      
       {policyToShow === 'terms' && (
        <PolicyModal 
            title="Terms of Service"
            content={fullTermsOfService}
            onClose={() => setPolicyToShow(null)}
        />
      )}
      {policyToShow === 'privacy' && (
        <PolicyModal 
            title="Privacy Policy"
            content={fullPrivacyPolicy}
            onClose={() => setPolicyToShow(null)}
        />
      )}
    </div>
  );
};

export default ConsentModal;