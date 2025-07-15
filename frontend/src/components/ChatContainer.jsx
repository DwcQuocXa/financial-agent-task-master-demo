import { useChat } from '../hooks/useChat';
import MessageList from './MessageList';
import MessageInput from './MessageInput';
import ConnectionStatus from './ConnectionStatus';
import '../styles/ChatContainer.css';

const ChatContainer = () => {
  const {
    messages,
    isLoading,
    isTyping,
    error,
    isApiAvailable,
    sendMessage,
    clearChat,
    addMessage,
  } = useChat();

  console.log('ChatContainer render - messages:', messages.length);

  // Simple test to add a message
  const testAddMessage = () => {
    console.log('Test button clicked - adding message');
    const testMessage = {
      id: Date.now(),
      text: 'Test message from button',
      sender: 'user',
      timestamp: new Date()
    };
    addMessage(testMessage);
  };

  return (
    <div className="chat-container">
      <header className="chat-header">
        <div className="header-content">
          <h1>Financial Agent Demo</h1>
          <p>Ask me any financial questions!</p>
        </div>
        <ConnectionStatus isApiAvailable={isApiAvailable} />
      </header>
      
      {/* Simple Debug Panel */}
      <div style={{ 
        background: '#f0f0f0', 
        padding: '10px', 
        margin: '10px', 
        borderRadius: '5px',
        fontSize: '12px'
      }}>
        <strong>Messages:</strong> {messages.length} | <strong>Loading:</strong> {isLoading.toString()}
        <br />
        <button 
          onClick={testAddMessage}
          style={{
            marginTop: '5px',
            padding: '5px 10px',
            backgroundColor: '#ff6b6b',
            color: 'white',
            border: 'none',
            borderRadius: '3px',
            cursor: 'pointer'
          }}
        >
          Test Add Message
        </button>
      </div>
      
      <MessageList 
        messages={messages} 
        isLoading={isLoading}
        isTyping={isTyping}
        error={error}
        onRetry={() => {}}
      />
      
      <MessageInput 
        onSendMessage={sendMessage}
        disabled={isLoading}
        onClearChat={clearChat}
      />
    </div>
  );
};

export default ChatContainer; 