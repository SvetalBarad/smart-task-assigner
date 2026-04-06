import React, { useState } from 'react';
import { MessageSquare, X } from 'lucide-react';

export const ChatbotWidget = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <div 
        className={`fixed bottom-24 right-6 z-50 w-[380px] h-[600px] sm:w-[450px] bg-background border rounded-xl shadow-2xl overflow-hidden flex flex-col transition-all duration-300 origin-bottom-right ${
          isOpen ? 'opacity-100 scale-100 pointer-events-auto translate-y-0' : 'opacity-0 scale-75 pointer-events-none translate-y-8'
        }`}
      >
        <div className="p-3 border-b flex justify-between items-center bg-muted/50">
          <h3 className="font-semibold text-sm flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-primary" />
            TaskFlow AI Assistant
          </h3>
          <button 
            onClick={() => setIsOpen(false)}
            className="p-1 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        {/* We append /?embed=true if supported by the tool, but plain Streamlit works well in iframe too */}
        <iframe
          src="http://localhost:8502/?embed=true"
          className="w-full flex-1 border-0 bg-background"
          title="Chatbot Interface"
          sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
        />
      </div>
      
      <div className="fixed bottom-6 right-6 z-[60]">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`w-14 h-14 bg-primary text-primary-foreground rounded-full flex items-center justify-center shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all duration-300 ${isOpen ? 'rotate-90 scale-90' : 'rotate-0'}`}
        >
          {isOpen ? <X className="w-6 h-6" /> : <MessageSquare className="w-6 h-6" />}
        </button>
      </div>
    </>
  );
};
