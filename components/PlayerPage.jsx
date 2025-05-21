// Live stream player page that supports multiple streaming protocols
// Handles stream playback, viewer count updates, and connection statistics
import { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import OvenPlayer from '../components/OvenPlayer';
import { setupStreamInfoTimer, cleanupStreamInfoTimer } from '../utils/streamInfoService';
import '../styles/PlayerPage.css';
import config, { logger } from '../utils/envConfig';

const PlayerPage = () => {
  const [streamSources, setStreamSources] = useState([]);
  const [streamName, setStreamName] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [streamInfo, setStreamInfo] = useState(null);
  const [isViewersUpdated, setIsViewersUpdated] = useState(false);
  const { streamName: streamNameParam } = useParams();
  const streamInfoTimerRef = useRef(null);
  const prevViewersCountRef = useRef(null);

  useEffect(() => {
    if (!streamNameParam) {
      setError('Stream name not specified. Unable to load player.');
      setIsLoading(false);
      return;
    }
    
    setStreamName(streamNameParam);
    
    // Build URLs for different protocols using centralized configuration
    const webrtcUrl = config.streaming.formatWebrtcUrl(streamNameParam);
    const llhlsUrl = config.streaming.formatLlhlsUrl(streamNameParam);
    
    // Create sources for OvenPlayer
    const sources = [
      {
        type: 'webrtc',
        file: webrtcUrl,
        label: 'WebRTC (Low Latency)'
      },
      {
        type: 'llhls',
        file: llhlsUrl,
        label: 'LL-HLS (HTTP Live Streaming)'
      }
    ];
    
    setStreamSources(sources);
    
    // Set up automatic stream information updates
    // with viewer count updates every minute
    streamInfoTimerRef.current = setupStreamInfoTimer(streamNameParam, (updatedInfo) => {
      // Check if viewer count has changed
      const currentViewers = updatedInfo?.totalConnections;
      if (prevViewersCountRef.current !== null && 
          currentViewers !== prevViewersCountRef.current) {
        // Activate animation
        setIsViewersUpdated(true);
        
        // Deactivate animation after 600ms (animation duration)
        setTimeout(() => {
          setIsViewersUpdated(false);
        }, 600);
      }
      
      // Update reference to previous count
      prevViewersCountRef.current = currentViewers;
      
      // Update stream information
      setStreamInfo(updatedInfo);
    });
    
    setIsLoading(false);
    
    // Clean up resources when component unmounts
    return () => {
      if (streamInfoTimerRef.current) {
        cleanupStreamInfoTimer(streamInfoTimerRef.current);
      }
    };
  }, [streamNameParam]);

  const handlePlayerReady = (player) => {
    console.log('Player ready:', player);
  };

  const handlePlayerError = (error) => {
    console.error('Player error:', error);
    setError(`An error occurred during playback: ${error.message || 'Unknown error'}`);
  };
  
  // Function to format viewer count
  const formatViewerCount = (count) => {
    if (count === undefined || count === null) return '0';
    
    // Below 1000, show exact number
    if (count < 1000) return count.toString();
    
    // Above 1000, format with K
    if (count < 10000) return (count / 1000).toFixed(1) + 'K';
    
    // Above 10000, don't show decimals
    return Math.floor(count / 1000) + 'K';
  };
  
  return (
    <div className="player-page">
      <div className="player-container">
        {isLoading ? (
          <div className="player-loading">Loading stream...</div>
        ) : error ? (
          <div className="player-error-message">{error}</div>
        ) : (
          <>
            <div className="video-container">
              <OvenPlayer
                sources={streamSources}
                autoStart={true}
                autoFallback={true}
                iceServers={config.iceServer}
                onReady={handlePlayerReady}
                onError={handlePlayerError}
              />

              <div className="stream-info-header">
                  <h1 className="stream-title">{streamName}</h1>
                  
                  <div className={`viewers-count ${isViewersUpdated ? 'updated' : ''}`} title={`${streamInfo?.totalConnections || 0} viewers`}>
                    <svg width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                      <path d="M16 8s-3-5.5-8-5.5S0 8 0 8s3 5.5 8 5.5S16 8 16 8zM1.173 8a13.133 13.133 0 0 1 1.66-2.043C4.12 4.668 5.88 3.5 8 3.5c2.12 0 3.879 1.168 5.168 2.457A13.133 13.133 0 0 1 14.828 8c-.058.087-.122.183-.195.288-.335.48-.83 1.12-1.465 1.755C11.879 11.332 10.119 12.5 8 12.5c-2.12 0-3.879-1.168-5.168-2.457A13.134 13.134 0 0 1 1.172 8z"/>
                      <path d="M8 5.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5zM4.5 8a3.5 3.5 0 1 1 7 0 3.5 3.5 0 0 1-7 0z"/>
                    </svg>
                    <span>{formatViewerCount(streamInfo?.totalConnections)}</span>
                  </div>
                </div>
                <div className="stream-status active">LIVE</div>
              </div>
        
            
          </>
        )}
      </div>
    </div>
  );
};

export default PlayerPage;