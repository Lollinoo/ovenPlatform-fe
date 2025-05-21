// Utility for managing automatic updates of stream information
// particularly the viewer counter and status

// Refresh duration in milliseconds (10 seconds)
const REFRESH_INTERVAL = 10 * 1000;

// Cache per evitare richieste multiple ravvicinate
const streamInfoCache = {
  data: null,
  timestamp: 0,
  cacheDuration: 5000, // 5 secondi di cache
};

// Function to fetch stream information
export const fetchStreamInfo = async (streamName) => {
  try {
    const response = await fetch(`/v1/ome/streams/${streamName}/stats`);
    if (!response.ok) {
      throw new Error("Error loading stream information");
    }

    const data = await response.json();
    return data || null;
  } catch (err) {
    console.error("Error fetching stream information:", err);
    return null;
  }
};

// Function to fetch all stream information
export const fetchAllStreamsInfo = async () => {
  try {
    const response = await fetch(`/v1/ome/streams`);
    if (!response.ok) {
      throw new Error("Error loading stream information");
    }

    return await response.json();
  } catch (err) {
    console.error("Error fetching all streams information:", err);
    return [];
  }
};

// Function to set up automatic refresh timer for a single stream information
export const setupStreamInfoTimer = (streamName, onUpdate) => {
  // Immediately retrieve information and update UI
  fetchStreamInfo(streamName).then((streamInfo) => {
    if (streamInfo) {
      onUpdate(streamInfo);
    }
  });

  // Set a timer to update information every minute
  const timerId = setInterval(() => {
    fetchStreamInfo(streamName).then((streamInfo) => {
      if (streamInfo) {
        onUpdate(streamInfo);
      }
    });
  }, REFRESH_INTERVAL);

  // Return timer ID for cleanup when component unmounts
  return timerId;
};

// Function to set up automatic refresh timer for all streams
export const setupAllStreamsInfoTimer = (onUpdate) => {
  // Immediately retrieve information and update UI
  fetchAllStreamsInfo().then((streamsInfo) => {
    if (streamsInfo && streamsInfo.length > 0) {
      onUpdate(streamsInfo);
    }
  });

  // Set a timer to update information every minute
  const timerId = setInterval(() => {
    fetchAllStreamsInfo().then((streamsInfo) => {
      if (streamsInfo && streamsInfo.length > 0) {
        onUpdate(streamsInfo);
      }
    });
  }, REFRESH_INTERVAL);

  // Return timer ID for cleanup when component unmounts
  return timerId;
};

// Function to clean up resources when no longer needed
export const cleanupStreamInfoTimer = (timerId) => {
  if (timerId) {
    clearInterval(timerId);
    console.log("Stream info timer has been cleaned up");
  }
};

// Function to fetch user's stream information including database status
export const fetchUserStreamInfo = async () => {
  const now = Date.now();

  // Verifica se abbiamo dati in cache ancora validi
  if (
    streamInfoCache.data &&
    now - streamInfoCache.timestamp < streamInfoCache.cacheDuration
  ) {
    console.log("Using cached stream info");
    return streamInfoCache.data;
  }

  try {
    const response = await fetch(`/v1/ome/streams/my-stream`, {
      credentials: "include", // Important for cookies
    });

    if (!response.ok) {
      throw new Error("Error loading stream information");
    }

    const data = await response.json();

    // Memorizza i dati nella cache
    streamInfoCache.data = data;
    streamInfoCache.timestamp = now;

    return data;
  } catch (err) {
    console.error("Error fetching user stream information:", err);
    return { success: false, message: err.message };
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
