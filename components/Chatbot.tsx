import React, { useState, useRef, useEffect } from 'react';
import { getChatbotResponse } from '../services/geminiService';
import { ChatIcon } from './icons/ChatIcon';
import { CloseIcon } from './icons/CloseIcon';
import { LoaderIcon } from './icons/LoaderIcon';

interface Message {
  id: number;
  text: string;
  sender: 'user' | 'bot';
}

const SendIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
        <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.428A1 1 0 0011 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
    </svg>
);

const Chatbot: React.FC<{ sessionId: string }> = ({ sessionId }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { id: 1, text: "Hello! How can I help you analyze your ideas today?", sender: 'bot' }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const prevSessionId = useRef(sessionId);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(scrollToBottom, [messages]);

  useEffect(() => {
    if (prevSessionId.current !== sessionId) {
        setMessages([{ id: 1, text: "Hello! How can I help you analyze your new content?", sender: 'bot' }]);
        prevSessionId.current = sessionId;
    }
  }, [sessionId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now(),
      text: inputValue,
      sender: 'user',
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      const responseText = await getChatbotResponse(sessionId, inputValue);
      const botMessage: Message = {
        id: Date.now() + 1,
        text: responseText,
        sender: 'bot',
      };
      setMessages(prev => [...prev, botMessage]);
    } catch (error) {
      console.error("Chatbot error:", error);
      const errorMessage: Message = {
        id: Date.now() + 1,
        text: "Sorry, I'm having trouble connecting. Please try again later.",
        sender: 'bot',
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-8 right-8 bg-brand-primary text-white p-4 rounded-full shadow-lg hover:bg-indigo-500 transition-colors z-50"
        aria-label="Toggle AI Chatbot"
      >
        {isOpen ? <CloseIcon /> : <ChatIcon />}
      </button>

      {isOpen && (
        <div className="fixed bottom-24 right-8 w-96 max-w-[90vw] h-[60vh] bg-brand-surface rounded-lg shadow-2xl flex flex-col animate-fade-in-up z-40 border border-gray-700">
          <div className="p-4 bg-brand-bg/50 rounded-t-lg border-b border-gray-700">
            <h3 className="font-bold text-lg text-brand-text">AI Assistant</h3>
          </div>

          <div className="flex-1 p-4 overflow-y-auto space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-xs lg:max-w-md px-4 py-2 rounded-xl ${
                    message.sender === 'user'
                      ? 'bg-brand-primary text-white'
                      : 'bg-brand-bg text-brand-text'
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap">{message.text}</p>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="max-w-xs lg:max-w-md px-4 py-2 rounded-xl bg-brand-bg text-brand-text flex items-center gap-2">
                  <LoaderIcon />
                  <span className="text-sm italic">Thinking...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="p-4 border-t border-gray-700">
            <form onSubmit={handleSubmit} className="flex items-center gap-2">
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Ask a question..."
                className="flex-1 bg-brand-bg border border-gray-600 rounded-lg py-2 px-3 text-sm focus:ring-brand-primary focus:border-brand-primary"
                disabled={isLoading}
              />
              <button
                type="submit"
                disabled={isLoading || !inputValue.trim()}
                className="bg-brand-secondary text-white p-2 rounded-lg disabled:bg-gray-500 disabled:cursor-not-allowed hover:bg-emerald-500 transition-colors"
              >
                <SendIcon />
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default Chatbot;
