import { useState, useRef, useEffect } from 'react';
import { Send, Trash2 } from 'lucide-react';
import '../styles/MessageInput.css';

const MessageInput = ({ onSendMessage, disabled, onClearChat }) => {
  const [message, setMessage] = useState('');
  const textareaRef = useRef(null);

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`;
    }
  }, [message]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (message.trim() && !disabled) {
      onSendMessage(message.trim());
      setMessage('');
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleClearChat = () => {
    if (window.confirm('Are you sure you want to clear the chat history?')) {
      onClearChat();
    }
  };

  return (
    <div className="message-input-container">
      <form onSubmit={handleSubmit} className="message-input-form">
        <div className="input-wrapper">
          <textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask a financial question..."
            className="message-input"
            disabled={disabled}
            rows={1}
          />
          
          <div className="button-group">
            <button 
              type="button"
              className="clear-button"
              onClick={handleClearChat}
              title="Clear chat history"
            >
              <Trash2 size={16} />
            </button>
            
            <button 
              type="submit" 
              className="send-button"
              disabled={!message.trim() || disabled}
              title="Send message"
            >
              <Send size={20} />
            </button>
          </div>
        </div>
      </form>
      
      <div className="input-footer">
        <p className="input-hint">
          Press Enter to send, Shift+Enter for new line
        </p>
      </div>
    </div>
  );
};

export default MessageInput; 