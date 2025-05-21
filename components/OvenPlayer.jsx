// Video player component using OvenPlayer for WebRTC and HLS support
// Handles stream playback, automatic fallback between protocols, and error states
import { useState, useEffect, useRef } from 'react';
import OvenPlayerLib from 'ovenplayer';
import Hls from 'hls.js';
import '../styles/OvenPlayer.css';
import config from '../utils/envConfig';

const OvenPlayer = ({ 
  sources, 
  autoStart = true, 
  autoFallback = false,
  iceServers = [config.iceServer],
  onReady = () => {},
  onError = () => {}
}) => {
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const playerInstance = useRef(null);

  useEffect(() => {
    // Initialize player directly, we have Hls from npm
    initializePlayer();

    // Cleanup function to destroy player when component unmounts
    return () => {
      if (playerInstance.current) {
        playerInstance.current.remove();
        playerInstance.current = null;
      }
    };
  }, [sources]); // Re-initialize player when sources change

  const initializePlayer = () => {
    setLoading(true);
    setError(null);

    if (playerInstance.current) {
      playerInstance.current.remove();
      playerInstance.current = null;
    }

    try {
      // Configure player with Hls from npm
      const playerConfig = {
        autoStart,
        autoFallback,
        sources,
        webrtcConfig: {
          iceServers: Array.isArray(iceServers) ? iceServers : [iceServers]
        }
      };

      // Configure HLS with low latency settings
      if (Hls.isSupported()) {
        playerConfig.hlsConfig = {
          liveSyncDuration: 2,
          liveMaxLatencyDuration: 3,
          liveDurationInfinity: true,
          lowLatencyMode: true
        };
        
        // Make Hls available to OvenPlayer
        window.Hls = Hls;
      }

      playerInstance.current = OvenPlayerLib.create('player', playerConfig);

      // Add event listeners
      playerInstance.current.on('ready', () => {
        setLoading(false);
        onReady(playerInstance.current);
      });

      playerInstance.current.on('error', (error) => {
        console.error('OvenPlayer error:', error);
        setError(`Error: ${error.code} - ${error.message || 'Unknown error'}`);
        onError(error);
      });
    } catch (error) {
      console.error('Error during player initialization:', error);
      setError(`Failed to initialize player: ${error.message || 'Unknown error'}`);
      setLoading(false);
      onError(error);
    }
  };

  return (
    <div className="oven-player-container">
      <div className="player-wrapper">
        <div id="player"></div>
        {loading && <div className="player-loading">Loading player...</div>}
      </div>
      {error && <div className="player-error">{error}</div>}
    </div>
  );
};

export default OvenPlayer;