import ReactMarkdown from 'react-markdown';
import { User, Bot } from 'lucide-react';
import '../styles/Message.css';

const Message = ({ message }) => {
  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  return (
    <div className={`message ${message.sender}`}>
      <div className="message-avatar">
        {message.sender === 'user' ? (
          <User size={20} />
        ) : (
          <Bot size={20} />
        )}
      </div>
      
      <div className="message-content">
        <div className="message-header">
          <span className="sender-name">
            {message.sender === 'user' ? 'You' : 'Financial Agent'}
          </span>
          <span className="message-time">
            {formatTime(message.timestamp)}
          </span>
        </div>
        
        <div className="message-bubble">
          {message.sender === 'bot' ? (
            <div className="message-text">
              <ReactMarkdown>
                {message.text}
              </ReactMarkdown>
            </div>
          ) : (
            <div className="message-text">
              {message.text}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Message; 