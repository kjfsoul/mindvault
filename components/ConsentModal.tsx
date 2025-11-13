
import React from 'react';

interface ConsentModalProps {
  onAccept: () => void;
}

const ConsentModal: React.FC<ConsentModalProps> = ({ onAccept }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
      <div className="bg-brand-surface rounded-lg shadow-2xl p-8 max-w-md w-full mx-4 text-center">
        <h2 className="text-2xl font-bold mb-4">Consent for Data Processing</h2>
        <p className="text-brand-text-muted mb-6">
          By uploading your conversation transcript ("Memory"), you consent to its processing by a large language model (LLM) to summarize, extract ideas, and generate tasks. Your data is processed for this purpose only and is not stored or used for training. Please ensure no sensitive personal information is included in your upload.
        </p>
        <button
          onClick={onAccept}
          className="w-full bg-brand-primary text-white font-bold py-3 px-6 rounded-lg shadow-md hover:bg-indigo-500 transition-all duration-300"
        >
          Acknowledge and Continue
        </button>
      </div>
    </div>
  );
};

export default ConsentModal;
