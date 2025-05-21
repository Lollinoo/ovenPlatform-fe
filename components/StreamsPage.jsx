// Main streams listing page that displays available live streams with thumbnails
// Handles stream creation, polling for updates, and thumbnail management
import { useState, useEffect, useRef } from "react";
import "../styles/StreamsPage.css";
import CreateStreamModal from "./CreateStreamModal";
import {
  setupThumbnailTimer,
  cleanupThumbnail,
  cleanupAllThumbnails,
} from "../utils/thumbnailService";
import {
  setupAllStreamsInfoTimer,
  cleanupStreamInfoTimer,
} from "../utils/streamInfoService";
import StreamDuration from "./StreamDuration";

function StreamsPage() {
  const [streams, setStreams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [modalIsOpen, setModalIsOpen] = useState(false);
  const [streamThumbnails, setStreamThumbnails] = useState({});
  const [isViewersUpdated, setIsViewersUpdated] = useState({});
  const [streamDetails, setStreamDetails] = useState({});
  const thumbnailTimersRef = useRef({});
  const streamInfoTimerRef = useRef(null);
  const prevViewersCountRef = useRef({});

  // Fetch streams from the server - used for initial load and manual refresh
  const fetchStreams = async () => {
    try {
      setLoading(true);
      // Fetch both active streams and stream details from database
      const [omeResponse, dbResponse] = await Promise.all([
        fetch("/v1/ome/streams"),
        fetch("/v1/ome/streams/details", {
          credentials: "include",
        }),
      ]);

      if (!omeResponse.ok || !dbResponse.ok) {
        throw new Error("Error loading streams");
      }

      const omeData = await omeResponse.json();
      const dbData = await dbResponse.json();

      // Merge the data from OME API with our database records
      const mergedStreams = omeData.map((stream) => {
        const dbStream = dbData.find((s) => s.username === stream.streamName);
        return {
          ...stream,
          startedAt: dbStream?.lastStreamStartedAt || stream.createdTime,
          streamSessionId: dbStream?.streamSessionId || null,
          isActive: true, // Coming from OME API means it's active
        };
      });

      // Use our updateStreamsInfo function to process the data
      updateStreamsInfo(mergedStreams);

      // Store additional stream details separately
      const detailsMap = {};
      dbData.forEach((stream) => {
        detailsMap[stream.username] = stream;
      });
      setStreamDetails(detailsMap);

      setError(null);
    } catch (err) {
      setError(err.message);
      console.error("Error fetching streams:", err);
    } finally {
      setLoading(false);
    }
  };

  // Function to update thumbnail for a specific stream
  const updateStreamThumbnail = (streamName, thumbnailUrl) => {
    setStreamThumbnails((prevThumbnails) => ({
      ...prevThumbnails,
      [streamName]: thumbnailUrl,
    }));
  };

  // Function to update all streams information (viewers, bitrate, etc.) independently
  const updateStreamsInfo = (updatedStreams) => {
    // If there's a loading state, clear it
    if (loading) {
      setLoading(false);
    }

    // If the component is in error state, clear it when we get valid data
    if (error && updatedStreams.length > 0) {
      setError(null);
    }

    // Compare previous and current viewer counts to animate changes
    const updatedViewersState = {};

    updatedStreams.forEach((updatedStream) => {
      const streamName = updatedStream.streamName;
      const currentViewers = updatedStream.totalConnections;

      // If we have previous data for this stream
      if (prevViewersCountRef.current[streamName] !== undefined) {
        // If the viewer count has changed
        if (currentViewers !== prevViewersCountRef.current[streamName]) {
          // Mark this stream for animation
          updatedViewersState[streamName] = true;

          // Schedule animation end after 600ms
          setTimeout(() => {
            setIsViewersUpdated((prev) => ({
              ...prev,
              [streamName]: false,
            }));
          }, 600);
        }
      }

      // Update previous count reference
      prevViewersCountRef.current[streamName] = currentViewers;
    });

    // Apply animation states if any changed
    if (Object.keys(updatedViewersState).length > 0) {
      setIsViewersUpdated((prev) => ({
        ...prev,
        ...updatedViewersState,
      }));
    }

    // Update streams data
    setStreams(updatedStreams);
  };

  // Function to format viewer count for display
  const formatViewerCount = (count) => {
    if (count === undefined || count === null) return "0";

    // Below 1000, show exact number
    if (count < 1000) return count.toString();

    // Above 1000, format with K
    if (count < 10000) return (count / 1000).toFixed(1) + "K";

    // Above 10000, don't show decimals
    return Math.floor(count / 1000) + "K";
  };

  // Configure timers for thumbnails and clean up old ones
  useEffect(() => {
    // Clean up any existing timers
    Object.keys(thumbnailTimersRef.current).forEach((streamName) => {
      cleanupThumbnail(streamName, thumbnailTimersRef.current[streamName]);
      delete thumbnailTimersRef.current[streamName];
    });

    // Set up new timers for each stream
    streams.forEach((stream) => {
      if (!thumbnailTimersRef.current[stream.streamName]) {
        const timerId = setupThumbnailTimer(stream.streamName, (thumbnailUrl) =>
          updateStreamThumbnail(stream.streamName, thumbnailUrl)
        );
        thumbnailTimersRef.current[stream.streamName] = timerId;
      }
    });
  }, [streams]);

  useEffect(() => {
    // Execute first fetch to show initial data
    fetchStreams();

    // Set up real-time stream updates using streamInfoService
    // This will handle both stream list updates and viewer count updates
    streamInfoTimerRef.current = setupAllStreamsInfoTimer(updateStreamsInfo);

    return () => {
      // Clean up stream info timer
      if (streamInfoTimerRef.current) {
        cleanupStreamInfoTimer(streamInfoTimerRef.current);
      }

      // Clean up all thumbnail timers and revoke all blob URLs
      Object.keys(thumbnailTimersRef.current).forEach((streamName) => {
        cleanupThumbnail(streamName, thumbnailTimersRef.current[streamName]);
      });

      // Clean up all thumbnail resources
      cleanupAllThumbnails();
    };
  }, []);

  const handleCreateStream = (streamData) => {
    // Check what type of update we're receiving
    if (streamData.streams) {
      // If we've received updated stream data, use it directly
      // This happens when a stream has been successfully detected
      updateStreamsInfo(streamData.streams);
    } else if (streamData.status === "creating") {
      // The stream has just been created, but isn't active yet
      // No need to fetch again, since the streamInfoService will update us
      setLoading(true); // Show loading state until stream is detected
    } else {
      // For compatibility with previous behavior
      fetchStreams();
    }
  };

  const formatDateTime = (dateString) => {
    const options = {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    };
    return new Date(dateString).toLocaleString("en-US", options);
  };

  return (
    <div className="streams-page">
      <div className="streams-container">
        <div className="page-header">
          <h1 className="page-title">Active Streams</h1>
          <button
            onClick={() => setModalIsOpen(true)}
            className="create-stream-button"
          >
            <svg width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
              <path d="M8 4a.5.5 0 0 1 .5.5v3h3a.5.5 0 0 1 0 1h-3v3a.5.5 0 0 1-1 0v-3h-3a.5.5 0 0 1 0-1h3v-3A.5.5 0 0 1 8 4z" />
            </svg>
            Create New Stream
          </button>
        </div>

        {loading ? (
          <div className="loading-indicator">
            <div className="spinner"></div>
          </div>
        ) : error ? (
          <div className="error-message">{error}</div>
        ) : streams.length === 0 ? (
          <div className="no-streams">
            <p>There are no active streams at the moment.</p>
            <p>Create a new stream to get started!</p>
          </div>
        ) : (
          <div className="streams-grid">
            {streams.map((stream) => {
              const dbStreamDetails = streamDetails[stream.streamName] || {};
              const streamStartTime =
                dbStreamDetails.lastStreamStartedAt || stream.createdTime;

              return (
                <div
                  key={stream.streamName}
                  className="stream-card"
                  onClick={() =>
                    (window.location.href = `/player/${stream.streamName}`)
                  }
                >
                  <div
                    className={`stream-thumbnail`}
                    style={{
                      backgroundImage: streamThumbnails[stream.streamName]
                        ? `url(${streamThumbnails[stream.streamName]})`
                        : "none",
                      backgroundSize: "cover",
                      backgroundPosition: "center",
                    }}
                  >
                    <div className="live-badge">Live</div>
                  </div>
                  <div className="stream-info">
                    <div className="stream-header">
                      <h3 className="stream-title">{stream.streamName}</h3>
                      <div
                        className={`viewers-count ${
                          isViewersUpdated[stream.streamName] ? "updated" : ""
                        }`}
                        title={`${stream.totalConnections || 0} viewers`}
                      >
                        <svg
                          width="16"
                          height="16"
                          fill="currentColor"
                          viewBox="0 0 16 16"
                        >
                          <path d="M16 8s-3-5.5-8-5.5S0 8 0 8s3 5.5 8 5.5S16 8 16 8zM1.173 8a13.133 13.133 0 0 1 1.66-2.043C4.12 4.668 5.88 3.5 8 3.5c2.12 0 3.879 1.168 5.168 2.457A13.133 13.133 0 0 1 14.828 8c-.058.087-.122.183-.195.288-.335.48-.83 1.12-1.465 1.755C11.879 11.332 10.119 12.5 8 12.5c-2.12 0-3.879-1.168-5.168-2.457A13.134 13.134 0 0 1 1.172 8z" />
                          <path d="M8 5.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5zM4.5 8a3.5 3.5 0 1 1 7 0 3.5 3.5 0 0 1-7 0z" />
                        </svg>
                        <span>
                          {formatViewerCount(stream.totalConnections)}
                        </span>
                      </div>
                    </div>
                    <div className="stream-status active">
                      <span className="status-indicator"></span>
                      <span className="status-text">LIVE</span>
                    </div>

                    <div className="stream-detail-item">
                      <span className="detail-label">Started:</span>
                      <span className="detail-value">
                        {formatDateTime(streamStartTime)}
                      </span>
                    </div>

                    <div className="stream-detail-item">
                      <span className="detail-label">Duration:</span>
                      <span className="detail-value">
                        <StreamDuration startTime={streamStartTime} />
                      </span>
                    </div>

                    <div className="stream-detail-item">
                      <span className="detail-label">Resolution:</span>
                      <span className="detail-value">
                        {stream.videoWidth} x {stream.videoHeight} -{" "}
                        {(stream.videoBitrate / 1_000_000).toFixed(2)}Mbps
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <CreateStreamModal
        isOpen={modalIsOpen}
        onClose={() => setModalIsOpen(false)}
        onCreateStream={handleCreateStream}
      />
    </div>
  );
}

export default StreamsPage;
