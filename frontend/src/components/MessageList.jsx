import { useEffect, useRef } from 'react';
import Message from './Message';
import { Loader2, RefreshCw, AlertTriangle } from 'lucide-react';
import '../styles/MessageList.css';

const MessageList = ({ messages, isLoading, isTyping, error, onRetry }) => {
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  return (
    <div className="message-list">
      {messages.length === 0 && !isLoading && (
        <div className="empty-state">
          <h3>Welcome to Financial Agent Demo!</h3>
          <p>Ask me any financial questions to get started. For example:</p>
          <ul>
            <li>"What is the P/E ratio of Apple?"</li>
            <li>"Explain the impact of interest rate hikes on tech stocks"</li>
            <li>"What are the key factors affecting cryptocurrency prices?"</li>
          </ul>
        </div>
      )}
      
      {messages.map((message) => (
        <Message key={message.id} message={message} />
      ))}
      
      {isTyping && (
        <div className="loading-message">
          <div className="message-bubble bot">
            <div className="loading-content">
              <Loader2 className="loading-spinner" size={16} />
              <span>Analyzing and researching...</span>
            </div>
          </div>
        </div>
      )}
      
      {error && (
        <div className="error-message">
          <div className="error-content">
            <AlertTriangle size={16} />
            <span>{error}</span>
            <button 
              className="retry-button"
              onClick={onRetry}
              title="Retry last message"
            >
              <RefreshCw size={14} />
              Retry
            </button>
          </div>
        </div>
      )}
      
      <div ref={messagesEndRef} />
    </div>
  );
};

export default MessageList; 