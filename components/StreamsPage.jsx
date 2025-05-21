// Main streams listing page that displays available live streams with thumbnails
// Handles stream creation, polling for updates, and thumbnail management
import { useState, useEffect, useRef, useCallback, useMemo } from "react";
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
  const [isPageVisible, setIsPageVisible] = useState(() => !document.hidden);

  // Refs for managing timers and state
  const thumbnailTimersRef = useRef({});
  const streamInfoTimerRef = useRef(null);
  const prevViewersCountRef = useRef({});
  const animationTimeoutsRef = useRef([]);
  const prevStreamsDataRef = useRef(null);
  const fetchInProgressRef = useRef({
    current: false,
    lastFetchTime: 0,
  });
  const abortControllerRef = useRef(null);

  // First declare updateStreamsInfo to avoid circular dependency error
  // Function to update all streams information (viewers, bitrate, etc.) independently
  const updateStreamsInfo = useCallback(
    (updatedStreams) => {
      // Skip if page is not visible
      if (!isPageVisible) return [];

      // If there's a loading state, clear it
      if (loading) {
        setLoading(false);
      }

      // If the component is in error state, clear it when we get valid data
      if (error && updatedStreams?.length > 0) {
        setError(null);
      }

      // Skip processing if no valid data
      if (!updatedStreams || updatedStreams.length === 0) {
        return [];
      }

      // Compare previous and current viewer counts to animate changes
      const updatedViewersState = {};
      // Track animation timeouts to clean them up if needed
      const timeouts = [];

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
            const timeoutId = setTimeout(() => {
              setIsViewersUpdated((prev) => ({
                ...prev,
                [streamName]: false,
              }));
            }, 600);

            // Store timeout ID for cleanup if component unmounts
            timeouts.push(timeoutId);
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

      // Update streams data - only if different to avoid unnecessary renders
      setStreams((prevStreams) => {
        // Simple length check
        if (prevStreams.length !== updatedStreams.length) {
          return updatedStreams;
        }

        // Check if any streams have changed by comparing relevant fields
        const hasChanges = updatedStreams.some((newStream, index) => {
          const oldStream = prevStreams[index];
          return (
            oldStream.streamName !== newStream.streamName ||
            oldStream.totalConnections !== newStream.totalConnections ||
            oldStream.videoBitrate !== newStream.videoBitrate ||
            oldStream.videoWidth !== newStream.videoWidth ||
            oldStream.videoHeight !== newStream.videoHeight
          );
        });

        return hasChanges ? updatedStreams : prevStreams;
      });

      // Return timeout IDs for potential cleanup
      return timeouts;
    },
    [loading, error, isPageVisible]
  );

  // Fetch streams from the server - used for initial load and manual refresh
  const fetchStreams = useCallback(
    async (silent = false) => {
      // Avoid simultaneous requests
      if (fetchInProgressRef.current) {
        console.log("Fetch already in progress, skipping duplicate request");
        return;
      }

      // Check if the page is visible
      if (!isPageVisible) {
        console.log("Page is not visible, skipping fetch");
        return;
      }

      // Implement a debounce check
      const now = Date.now();
      const minFetchInterval = 2500; // 2.5 seconds
      const lastFetchTime = fetchInProgressRef.current.lastFetchTime || 0;

      if (now - lastFetchTime < minFetchInterval) {
        console.log(
          `Throttling fetchStreams call (last call ${
            now - lastFetchTime
          }ms ago)`
        );
        return;
      }

      try {
        fetchInProgressRef.current = true;
        fetchInProgressRef.current.lastFetchTime = now;

        // Cancel any previous request
        if (abortControllerRef.current) {
          abortControllerRef.current.abort();
        }

        // Create a new controller for this request
        abortControllerRef.current = new AbortController();

        if (!silent) setLoading(true);

        // Fetch both active streams and stream details from database
        const [omeResponse, dbResponse] = await Promise.all([
          fetch("/v1/ome/streams", {
            // Add cache control to avoid browser caching
            headers: { "Cache-Control": "no-cache, no-store" },
            signal: AbortSignal.timeout(10000), // 10 seconds timeout
          }),
          fetch("/v1/ome/streams/details", {
            credentials: "include",
            headers: { "Cache-Control": "no-cache, no-store" },
            signal: AbortSignal.timeout(10000), // 10 seconds timeout
          }),
        ]);

        if (!omeResponse.ok || !dbResponse.ok) {
          throw new Error("Error loading streams");
        }

        const omeData = await omeResponse.json();
        const dbData = await dbResponse.json(); // Check if the data has actually changed
        const dataSignature = JSON.stringify(omeData.map((s) => s.streamName));
        if (prevStreamsDataRef.current === dataSignature) {
          console.log("Stream data unchanged, skipping update");
          if (!silent) setLoading(false);
          return;
        }

        // Add more advanced check to detect real changes in data
        if (prevStreamsDataRef.current) {
          const prevStreams = streams;
          if (prevStreams.length === omeData.length) {
            // Check if essential data has changed
            const hasSignificantChanges = omeData.some((newStream, idx) => {
              const oldStream = prevStreams[idx];
              return (
                !oldStream ||
                oldStream.streamName !== newStream.streamName ||
                oldStream.totalConnections !== newStream.totalConnections ||
                Math.abs(oldStream.videoBitrate - newStream.videoBitrate) >
                  100000 // 100kbps tolerance
              );
            });

            if (!hasSignificantChanges) {
              console.log(
                "No significant changes in stream data, skipping update"
              );
              if (!silent) setLoading(false);
              return;
            }
          }
        }

        // Store the data signature for the next check
        prevStreamsDataRef.current = dataSignature;

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
        setStreamDetails((prev) => {
          // Comparison to avoid unnecessary updates
          if (JSON.stringify(prev) === JSON.stringify(detailsMap)) {
            return prev;
          }
          return detailsMap;
        });

        setError(null);
      } catch (err) {
        // No need to show error message if this was a silent refresh
        // or if it's an AbortError (caused by timeout or a new request)
        if (!silent && err.name !== "AbortError") {
          setError(err.message);
          console.error("Error fetching streams:", err);
        }
      } finally {
        fetchInProgressRef.current = false;
        if (!silent) setLoading(false);
      }
    },
    [updateStreamsInfo, streams, isPageVisible]
  );

  // Function to update thumbnail for a specific stream
  const updateStreamThumbnail = useCallback(
    (streamName, thumbnailUrl) => {
      // Skip if page is not visible
      if (!isPageVisible) return;

      setStreamThumbnails((prevThumbnails) => {
        // Skip update if the URL hasn't changed to avoid unnecessary renders
        if (prevThumbnails[streamName] === thumbnailUrl) {
          return prevThumbnails;
        }
        return {
          ...prevThumbnails,
          [streamName]: thumbnailUrl,
        };
      });
    },
    [isPageVisible]
  );

  // Function to format viewer count for display
  const formatViewerCount = useCallback((count) => {
    if (count === undefined || count === null) return "0";

    // Below 1000, show exact number
    if (count < 1000) return count.toString();

    // Above 1000, format with K
    if (count < 10000) return (count / 1000).toFixed(1) + "K";

    // Above 10000, don't show decimals
    return Math.floor(count / 1000) + "K";
  }, []);

  // Memoized to avoid unnecessary re-renders
  const formatDateTime = useCallback((dateString) => {
    const options = {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    };
    return new Date(dateString).toLocaleString("en-US", options);
  }, []);

  // Configure timers for thumbnails and clean up old ones
  useEffect(() => {
    // Skip processing if no streams are available or page is not visible
    if (!streams || streams.length === 0 || !isPageVisible) return;

    // Get current stream names
    const currentStreamNames = new Set(
      streams.map((stream) => stream.streamName)
    );

    // Clean up timers for streams that no longer exist
    Object.keys(thumbnailTimersRef.current).forEach((streamName) => {
      if (!currentStreamNames.has(streamName)) {
        cleanupThumbnail(streamName, thumbnailTimersRef.current[streamName]);
        delete thumbnailTimersRef.current[streamName];
      }
    });

    // Set up new timers for new streams only
    streams.forEach((stream) => {
      if (!thumbnailTimersRef.current[stream.streamName]) {
        const timerObj = setupThumbnailTimer(
          stream.streamName,
          (thumbnailUrl) =>
            updateStreamThumbnail(stream.streamName, thumbnailUrl)
        );
        thumbnailTimersRef.current[stream.streamName] = timerObj;
      }
    });
  }, [streams, updateStreamThumbnail, isPageVisible]);

  // Managing page visibility and API timers
  useEffect(() => {
    let isMounted = true;

    // Safe fetch function that checks if component is still mounted
    const safeFetchStreams = (silent = false) => {
      if (isMounted) {
        fetchStreams(silent);
      }
    };

    // Execute first fetch to show initial data only if page is visible
    if (isPageVisible) {
      // Slightly delay initial fetch to avoid clustered calls
      setTimeout(() => {
        if (isMounted && isPageVisible) {
          safeFetchStreams();
        }
      }, 100);

      // Configure the stream info timer only once at initialization
      if (!streamInfoTimerRef.current) {
        // Use a version that doesn't call updateStreamsInfo directly
        // but passes through a function that checks if the data has changed
        const handleStreamsUpdate = (updatedStreams) => {
          if (isMounted && isPageVisible) {
            // Check if the data has actually changed
            // Use a more comprehensive check including viewers and bitrate
            const dataSignature = JSON.stringify(
              updatedStreams.map(
                (s) => `${s.streamName}_${s.totalConnections}_${s.videoBitrate}`
              )
            );

            // Just previous timestamp for comparison
            const prevSignature = JSON.stringify(
              streams.map(
                (s) => `${s.streamName}_${s.totalConnections}_${s.videoBitrate}`
              )
            );

            if (prevSignature !== dataSignature) {
              updateStreamsInfo(updatedStreams);
            } else {
              console.log("Stream data unchanged from timer, skipping update");
            }
          }
        };

        // Slightly delay timer configuration
        setTimeout(() => {
          if (isMounted && isPageVisible && !streamInfoTimerRef.current) {
            streamInfoTimerRef.current =
              setupAllStreamsInfoTimer(handleStreamsUpdate);
          }
        }, 500);
      }
    }

    // Add visibility change handler to pause/resume API calls when page is not visible
    const handleVisibilityChange = () => {
      const isVisible = !document.hidden;
      setIsPageVisible(isVisible);

      if (isVisible && isMounted) {
        // Page became visible again, do a silent refresh
        // Introduce a small delay to avoid immediately triggering API calls
        setTimeout(() => {
          if (isMounted && !document.hidden) {
            safeFetchStreams(true); // silent refresh
          }
        }, 300);

        // Restart real-time updates if needed
        if (!streamInfoTimerRef.current) {
          // Same management as above with data verification
          const handleStreamsUpdate = (updatedStreams) => {
            if (isMounted && isPageVisible) {
              const dataSignature = JSON.stringify(
                updatedStreams.map(
                  (s) =>
                    `${s.streamName}_${s.totalConnections}_${s.videoBitrate}`
                )
              );

              const prevSignature = JSON.stringify(
                streams.map(
                  (s) =>
                    `${s.streamName}_${s.totalConnections}_${s.videoBitrate}`
                )
              );

              if (prevSignature !== dataSignature) {
                updateStreamsInfo(updatedStreams);
              } else {
                console.log(
                  "Stream data unchanged from timer, skipping update"
                );
              }
            }
          };

          // Slightly delay timer configuration after visibility change
          setTimeout(() => {
            if (isMounted && isPageVisible && !streamInfoTimerRef.current) {
              streamInfoTimerRef.current =
                setupAllStreamsInfoTimer(handleStreamsUpdate);
            }
          }, 500);
        }
      } else {
        // Page is hidden, suspend real-time updates to save resources
        if (streamInfoTimerRef.current) {
          cleanupStreamInfoTimer(streamInfoTimerRef.current);
          streamInfoTimerRef.current = null;
        }

        // Clear any animation timeouts
        animationTimeoutsRef.current.forEach(clearTimeout);
        animationTimeoutsRef.current = [];
      }
    };

    // Add event listener for page visibility
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      // Mark component as unmounted to prevent updates after dismounting
      isMounted = false;

      // Clean up visibility event listener
      document.removeEventListener("visibilitychange", handleVisibilityChange);

      // Clean up animation timeouts
      animationTimeoutsRef.current.forEach(clearTimeout);
      animationTimeoutsRef.current = [];

      // Clean up stream info timer
      if (streamInfoTimerRef.current) {
        cleanupStreamInfoTimer(streamInfoTimerRef.current);
        streamInfoTimerRef.current = null;
      }

      // Clean up all thumbnail timers
      Object.keys(thumbnailTimersRef.current).forEach((streamName) => {
        cleanupThumbnail(streamName, thumbnailTimersRef.current[streamName]);
      });

      // Clean up all thumbnail resources
      cleanupAllThumbnails();

      // Cancel any ongoing fetch requests
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []); // Remove dependencies to run effect only once during mounting

  const handleCreateStream = useCallback(
    (streamData) => {
      // Check what type of update we're receiving
      if (streamData.streams) {
        // If we've received updated stream data, use it directly
        // This happens when a stream has been successfully detected

        // Check if data has already been processed to avoid infinite loops
        const dataSignature = JSON.stringify(
          streamData.streams.map((s) => s.streamName)
        );
        if (prevStreamsDataRef.current !== dataSignature) {
          updateStreamsInfo(streamData.streams);
        } else {
          console.log(
            "Stream data unchanged from createStream, skipping update"
          );
        }
      } else if (streamData.status === "creating") {
        // The stream has just been created, but isn't active yet
        // No need to fetch again, since the streamInfoService will update us
        setLoading(true); // Show loading state until stream is detected
      } else {
        // For compatibility with previous behavior
        fetchStreams();
      }
    },
    [updateStreamsInfo, fetchStreams]
  );

  // Memoize the main content section for better performance
  const renderMainContent = useMemo(() => {
    if (loading) {
      return (
        <div className="loading-indicator">
          <div className="spinner"></div>
        </div>
      );
    }

    if (error) {
      return <div className="error-message">{error}</div>;
    }

    if (streams.length === 0) {
      return (
        <div className="no-streams">
          <p>There are no active streams at the moment.</p>
          <p>Create a new stream to get started!</p>
        </div>
      );
    }

    return (
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
                    <span>{formatViewerCount(stream.totalConnections)}</span>
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
    );
  }, [
    loading,
    error,
    streams,
    streamDetails,
    streamThumbnails,
    isViewersUpdated,
    formatViewerCount,
    formatDateTime,
  ]);

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

        {renderMainContent}
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
