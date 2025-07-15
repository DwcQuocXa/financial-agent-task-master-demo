import { Wifi, WifiOff, AlertCircle } from 'lucide-react';
import '../styles/ConnectionStatus.css';

const ConnectionStatus = ({ isApiAvailable }) => {
  if (isApiAvailable === null) {
    return (
      <div className="connection-status checking">
        <AlertCircle size={16} />
        <span>Checking connection...</span>
      </div>
    );
  }

  return (
    <div className={`connection-status ${isApiAvailable ? 'connected' : 'disconnected'}`}>
      {isApiAvailable ? (
        <>
          <Wifi size={16} />
          <span>API Connected</span>
        </>
      ) : (
        <>
          <WifiOff size={16} />
          <span>API Offline (Demo Mode)</span>
        </>
      )}
    </div>
  );
};

export default ConnectionStatus; 