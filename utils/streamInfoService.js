/**
 * Stream Information Service
 *
 * Utility module for managing automatic updates of stream information,
 * particularly handling viewer counts, bitrates, and stream status.
 * This service manages API calls with timeout handling, throttling,
 * and caching mechanisms to prevent unnecessary API load.
 */

// Default refresh interval in milliseconds (10 seconds)
const REFRESH_INTERVAL = 10 * 1000;

/**
 * Cache object to prevent multiple closely timed requests
 * Stores the most recent data to reduce unnecessary API calls
 */
const streamInfoCache = {
  data: null,
  timestamp: 0,
  cacheDuration: 5000, // 5 seconds cache validity
};

/**
 * Request state tracking to prevent simultaneous API calls to the same endpoints
 * Uses a Map for individual streams and boolean flags for global operations
 */
const pendingRequests = {
  streamInfo: new Map(), // Track requests for individual streams
  allStreams: false, // Flag for the "all streams" endpoint
  userStream: false, // Flag for the current user's stream
};

/**
 * Cache for global request throttling
 * Stores timestamps and data signatures to prevent redundant API calls
 */
const requestsCache = {
  lastAllStreamsRequest: 0, // Last timestamp of the all streams request
  minRequestInterval: 2500, // Minimum 2.5 seconds between global requests
  lastStreamDataSignature: null, // Store data hash to detect actual changes
};

/**
 * Creates an AbortController with timeout functionality
 * Used to prevent API requests from hanging indefinitely
 *
 * @param {number} timeoutMs - Timeout duration in milliseconds (defaults to 5 seconds)
 * @returns {Object} An object containing the AbortController signal and a cleanup function
 */
const createTimeoutSignal = (timeoutMs = 5000) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  return {
    signal: controller.signal,
    clearTimeout: () => clearTimeout(timeoutId),
  };
};

/**
 * Fetches information for a specific stream
 *
 * This function retrieves detailed statistics for a single stream by name.
 * Includes protection against duplicate requests and timeout handling.
 *
 * @param {string} streamName - The name/ID of the stream to fetch information for
 * @returns {Promise<Object|null>} Stream information object or null if request failed
 */
export const fetchStreamInfo = async (streamName) => {
  // Skip if there's already an ongoing request for this stream
  if (pendingRequests.streamInfo.get(streamName)) {
    console.log(`Skipping duplicate request for stream ${streamName}`);
    return null;
  }

  // Set the in-progress request flag
  pendingRequests.streamInfo.set(streamName, true);

  // Set up request timeout to prevent hanging requests (8 seconds)
  const { signal, clearTimeout } = createTimeoutSignal(8000);

  try {
    const response = await fetch(`/v1/ome/streams/${streamName}/stats`, {
      signal,
      headers: { "Cache-Control": "no-cache, no-store" }, // Prevent browser caching
    });

    if (!response.ok) {
      throw new Error("Error loading stream information");
    }

    const data = await response.json();
    return data || null;
  } catch (err) {
    // Don't log abort errors (they're expected when using timeouts)
    if (err.name !== "AbortError") {
      console.error("Error fetching stream information:", err);
    }
    return null;
  } finally {
    // Clean up timeout and reset request flag
    clearTimeout();
    pendingRequests.streamInfo.set(streamName, false);
  }
};

/**
 * Fetches information for all active streams
 *
 * This function retrieves information about all currently active streams.
 * Includes multiple safeguards:
 * - Prevention of duplicate/simultaneous requests
 * - Skip if page/tab is not visible
 * - Global request throttling using localStorage
 * - Request timeout handling
 *
 * @returns {Promise<Array>} Array of stream information objects or empty array if request failed
 */
export const fetchAllStreamsInfo = async () => {
  // Skip if there's already an ongoing request for all streams
  if (pendingRequests.allStreams) {
    console.log("Skipping duplicate request for all streams");
    return [];
  }

  // Skip if the document/tab is not visible to save resources
  if (document.hidden) {
    console.log("Document is hidden, skipping fetch all streams");
    return [];
  }

  // Global debounce/throttling implementation
  const now = Date.now();
  const lastCallKey = "last_fetch_all_streams_time";
  const lastCallTime = parseInt(localStorage.getItem(lastCallKey) || "0", 10);
  const minCallInterval = 2500; // 2.5 seconds between global requests

  // If request happens too soon after the last one, skip it
  if (now - lastCallTime < minCallInterval) {
    console.log(
      `Global throttling for fetchAllStreamsInfo (last call ${
        now - lastCallTime
      }ms ago)`
    );
    return [];
  }

  // Set the in-progress request flag
  pendingRequests.allStreams = true;

  // Update the last call timestamp in localStorage
  localStorage.setItem(lastCallKey, now.toString());

  // Set up request timeout to prevent hanging requests (8 seconds)
  const { signal, clearTimeout } = createTimeoutSignal(8000);

  try {
    const response = await fetch(`/v1/ome/streams`, {
      signal,
      headers: { "Cache-Control": "no-cache, no-store" }, // Prevent browser caching
    });

    if (!response.ok) {
      throw new Error("Error loading stream information");
    }

    return await response.json();
  } catch (err) {
    // Only log non-abort errors
    if (err.name !== "AbortError") {
      console.error("Error fetching all streams information:", err);
    }
    return [];
  } finally {
    // Clean up timeout and reset request flag
    clearTimeout();
    pendingRequests.allStreams = false;
  }
};

/**
 * Sets up an automatic refresh timer for a single stream's information
 *
 * This function creates a recurring timer that periodically fetches
 * updated information for a specific stream and passes it to the provided
 * callback function. It also performs an immediate fetch on setup.
 *
 * @param {string} streamName - The name/ID of the stream to monitor
 * @param {Function} onUpdate - Callback function called with updated stream info
 * @returns {Object} Object containing the timer ID and cleanup function
 */
export const setupStreamInfoTimer = (streamName, onUpdate) => {
  // Flag to track if the component using this timer is still mounted
  let isMounted = true;

  // Immediately retrieve information and update UI when timer is set up
  fetchStreamInfo(streamName).then((streamInfo) => {
    if (streamInfo && isMounted) {
      onUpdate(streamInfo);
    }
  });

  // Set up a recurring timer to update information at regular intervals
  const timerId = setInterval(() => {
    // Skip updates when the document/tab is not visible to save resources
    if (document.hidden) {
      console.log("Document is hidden, skipping stream info update");
      return;
    }

    // Fetch and process updated stream information
    fetchStreamInfo(streamName).then((streamInfo) => {
      if (streamInfo && isMounted) {
        onUpdate(streamInfo);
      }
    });
  }, REFRESH_INTERVAL);

  // Return object with timer ID and cleanup function to prevent memory leaks
  return {
    timerId,
    cleanup: () => {
      isMounted = false;
      clearInterval(timerId);
    },
  };
};

// Function to set up automatic refresh timer for all streams
export const setupAllStreamsInfoTimer = (onUpdate) => {
  // Tieni traccia se il componente è ancora montato
  let isMounted = true;

  // Traccia la timestamp dell'ultima richiesta per limitare la frequenza
  let lastRequestTime = 0;
  const minRequestInterval = 3000; // Aumentato a 3 secondi tra le richieste per ridurre il carico

  // Cache per l'ultima signature dei dati per evitare aggiornamenti non necessari
  let lastDataSignature = null;

  // Flag per tenere traccia delle richieste in corso
  let isFetchInProgress = false;

  // Funzione sicura per effettuare le chiamate API controllate
  const safePerformFetch = async () => {
    // Se c'è già una richiesta in corso, evita di avviarne un'altra
    if (isFetchInProgress) {
      console.log("Fetch already in progress, skipping");
      return;
    }

    // Verifica se la chiamata è troppo rapida rispetto all'ultima
    const now = Date.now();
    if (now - lastRequestTime < minRequestInterval) {
      console.log("Request too soon, throttling");
      return;
    }

    // Verifica se il componente è ancora montato e la pagina è visibile
    if (!isMounted || document.hidden) {
      return;
    }

    // Aggiorna il timestamp prima di iniziare la richiesta
    lastRequestTime = now;

    try {
      isFetchInProgress = true;
      const streamsInfo = await fetchAllStreamsInfo();

      // Verifica se ci sono dati validi e se sono cambiati
      if (
        streamsInfo &&
        streamsInfo.length > 0 &&
        isMounted &&
        !document.hidden
      ) {
        // Crea una firma dei nuovi dati
        const dataSignature = JSON.stringify(
          streamsInfo.map(
            (s) => `${s.streamName}_${s.totalConnections}_${s.videoBitrate}`
          )
        );

        // Verifica se i dati sono effettivamente cambiati
        if (dataSignature !== lastDataSignature) {
          lastDataSignature = dataSignature;
          onUpdate(streamsInfo);
        } else {
          console.log(
            "Stream data unchanged from timer, skipping update callback"
          );
        }
      }
    } catch (err) {
      console.error("Error in timer fetch:", err);
    } finally {
      isFetchInProgress = false;
    }
  };

  // Pianifica la prima richiesta con un breve ritardo per evitare richieste immediate
  // questo aiuta quando ci sono multiple chiamate all'inizializzazione
  const initialTimer = setTimeout(() => {
    if (isMounted && !document.hidden) {
      safePerformFetch();
    }
  }, 500);

  // Set a timer to update information every REFRESH_INTERVAL
  const timerId = setInterval(safePerformFetch, REFRESH_INTERVAL);

  // Return object with timer ID and cleanup function
  return {
    timerId,
    cleanup: () => {
      isMounted = false;
      clearTimeout(initialTimer);
      clearInterval(timerId);
      console.log("Stream info timer has been cleaned up");
    },
  };
};

// Function to clean up resources when no longer needed
export const cleanupStreamInfoTimer = (timerObj) => {
  if (!timerObj) return;

  if (typeof timerObj === "number") {
    clearInterval(timerObj);
    console.log("Stream info timer has been cleaned up");
  } else if (timerObj.cleanup && typeof timerObj.cleanup === "function") {
    timerObj.cleanup();
    console.log("Stream info timer has been cleaned up");
  }
};

// Function to fetch user's stream information including database status
export const fetchUserStreamInfo = async () => {
  const now = Date.now();

  if (
    streamInfoCache.data &&
    now - streamInfoCache.timestamp < streamInfoCache.cacheDuration
  ) {
    console.log("Using cached stream info");
    return streamInfoCache.data;
  }

  if (pendingRequests.userStream) {
    console.log("Skipping duplicate request for user stream");
    return { success: false, message: "Request already in progress" };
  }

  pendingRequests.userStream = true;

  const { signal, clearTimeout } = createTimeoutSignal(8000);

  try {
    const response = await fetch(`/v1/ome/streams/my-stream`, {
      credentials: "include", // Important for cookies
      signal,
      headers: { "Cache-Control": "no-cache, no-store" },
    });

    if (!response.ok) {
      throw new Error("Error loading stream information");
    }

    const data = await response.json();

    streamInfoCache.data = data;
    streamInfoCache.timestamp = now;

    return data;
  } catch (err) {
    if (err.name !== "AbortError") {
      console.error("Error fetching user stream information:", err);
    }
    return { success: false, message: err.message };
  } finally {
    clearTimeout();
    pendingRequests.userStream = false;
  }
};

// Function to terminate an active stream
export const terminateStream = async (streamId) => {
  try {
    const response = await fetch(`/v1/ome/streams/${streamId}/terminate`, {
      method: "POST",
      credentials: "include", // Important for cookies
      headers: {
        "Content-Type": "application/json",
      },
    });

    return await response.json();
  } catch (err) {
    console.error("Error terminating stream:", err);
    return { success: false, message: err.message };
  }
};

/**
 * Format stream duration from a start time to current time
 * @param {Date|string|number} startTime - Stream start time
 * @returns {string} - Formatted duration string (HH:MM:SS)
 */
export const formatStreamDuration = (startTime) => {
  if (!startTime) return "00:00:00";

  const now = new Date();
  const start = new Date(startTime);
  const diff = now - start;

  // Handle invalid dates
  if (isNaN(diff)) return "00:00:00";

  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);

  return `${hours.toString().padStart(2, "0")}:${minutes
    .toString()
    .padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
};

/**
 * Get stream status information (active/inactive)
 * @param {string} username - User's username
 * @returns {Promise<Object>} - Stream status object
 */
export const getStreamStatus = async (username) => {
  try {
    const response = await fetch(`/v1/ome/streams/status/${username}`, {
      credentials: "include",
    });

    if (!response.ok) {
      throw new Error("Error fetching stream status");
    }

    return await response.json();
  } catch (err) {
    console.error("Error getting stream status:", err);
    return { success: false, isActive: false };
  }
};

/**
 * Set up a timer to automatically update the stream duration display
 * @param {function} updateFn - Function to call with updated duration
 * @param {Date|string|number} startTime - Stream start time
 * @returns {number} - Timer ID for cleanup
 */
export const setupDurationTimer = (updateFn, startTime) => {
  if (!startTime) return null;

  // Update immediately
  updateFn(formatStreamDuration(startTime));

  // Then update every second
  const timerId = setInterval(() => {
    updateFn(formatStreamDuration(startTime));
  }, 1000);

  return timerId;
};

/**
 * Clean up duration timer
 * @param {number} timerId - Timer ID to clear
 */
export const cleanupDurationTimer = (timerId) => {
  if (timerId) {
    clearInterval(timerId);
  }
};
