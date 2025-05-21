/**
 * Utility for managing stream thumbnail fetching and storage.
 *
 * This service provides functions to handle the retrieval, caching, and
 * updating of stream thumbnails using `localStorage`. It supports storing
 * images as Base64 strings for persistence and generating blob URLs for
 * immediate use. The service also includes mechanisms to refresh thumbnails
 * periodically and clean up resources when no longer needed.
 *
 * Key Features:
 * - Fetch and cache thumbnails for streams.
 * - Store images in `localStorage` as Base64 strings.
 * - Generate and manage blob URLs for cached images.
 * - Automatically refresh thumbnails based on a configurable interval.
 * - Clean up blob URLs and cached data when no longer needed.
 */
import placeholderImage from "../assets/thumbnail-placeholder.jpg";

// Prefixes for storage keys
const THUMBNAIL_PREFIX = "stream_thumb_";
const TIMESTAMP_PREFIX = "stream_thumb_time_";
const BLOB_PREFIX = "stream_blob_";

// Duration of refresh in milliseconds (5 minutes)
const REFRESH_INTERVAL = 5 * 60 * 1000;

// Tracker for ongoing requests to avoid duplicates
const pendingRequests = new Map();

// Factory for creating timeout signals for fetch operations
const createTimeoutSignal = (timeoutMs = 5000) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  return {
    signal: controller.signal,
    clearTimeout: () => clearTimeout(timeoutId),
  };
};

// Function to check if a blob URL is still valid
const isBlobUrlValid = (url) => {
  if (!url || !url.startsWith("blob:")) return false;

  try {
    // Try to retrieve the blob, if it fails it means it has been revoked
    const xhr = new XMLHttpRequest();
    xhr.open("HEAD", url, false); // synchronous for simplicity
    xhr.send();
    return xhr.status !== 0; // If status is 0, the request failed (URL revoked)
  } catch (e) {
    return false;
  }
};

// Function to get storage key names
const getStorageKey = (streamName) => `${THUMBNAIL_PREFIX}${streamName}`;
const getTimestampKey = (streamName) => `${TIMESTAMP_PREFIX}${streamName}`;
const getBlobKey = (streamName) => `${BLOB_PREFIX}${streamName}`;

// Function to save an image to localStorage as Base64
const saveImageToStorage = async (streamName, imageBlob) => {
  try {
    // Verify we have a valid blob with size > 0
    if (!imageBlob || imageBlob.size === 0) {
      console.warn("Invalid blob received for", streamName);
      return placeholderImage;
    }

    // Convert blob to base64 for better persistence
    const base64String = await blobToBase64(imageBlob);

    // Save base64 string to localStorage
    localStorage.setItem(getBlobKey(streamName), base64String);

    // Revoke any existing blob URL before creating a new one
    const existingUrl = localStorage.getItem(getStorageKey(streamName));
    if (existingUrl && existingUrl.startsWith("blob:")) {
      try {
        URL.revokeObjectURL(existingUrl);
      } catch (e) {
        console.warn("Error revoking existing blob URL:", e);
      }
    }

    // Generate a blob URL for immediate use
    const objectUrl = URL.createObjectURL(imageBlob);

    // Save the object URL to localStorage for use in current session
    localStorage.setItem(getStorageKey(streamName), objectUrl);

    // Save current timestamp
    localStorage.setItem(getTimestampKey(streamName), Date.now().toString());

    return objectUrl;
  } catch (error) {
    console.error("Error saving image:", error);
    return placeholderImage;
  }
};

// Function to convert blob to base64
const blobToBase64 = (blob) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

// Function to convert base64 to blob
const base64ToBlob = async (base64) => {
  try {
    const res = await fetch(base64);
    return await res.blob();
  } catch (e) {
    console.error("Error converting base64 to blob:", e);
    return null;
  }
};

// Function to retrieve an image from localStorage
const getImageFromStorage = async (streamName) => {
  try {
    // First check if there's a valid blob URL from current session
    const blobUrl = localStorage.getItem(getStorageKey(streamName));

    if (blobUrl && blobUrl.startsWith("blob:") && isBlobUrlValid(blobUrl)) {
      return blobUrl;
    }

    // If blob URL is not valid, check if we have base64 data
    const base64Data = localStorage.getItem(getBlobKey(streamName));

    if (base64Data && base64Data.startsWith("data:")) {
      // Convert base64 to blob and create a new URL
      const blob = await base64ToBlob(base64Data);
      if (blob) {
        const newBlobUrl = URL.createObjectURL(blob);
        localStorage.setItem(getStorageKey(streamName), newBlobUrl);
        return newBlobUrl;
      }
    }

    // If we can't retrieve the image, return the placeholder
    return placeholderImage;
  } catch (error) {
    console.error("Error retrieving image:", error);
    return placeholderImage;
  }
};

/**
 * Determines whether the image for a given stream should be refreshed based on a timestamp.
 *
 * This function retrieves the last fetch timestamp for the specified stream from localStorage
 * and compares it to the current time. If the timestamp is missing, invalid, or the difference
 * between the current time and the last fetch exceeds the defined refresh interval, the function
 * returns `true`, indicating that the image should be refreshed.
 *
 * @param {string} streamName - The name of the stream for which to check the refresh status.
 * @returns {boolean} - Returns `true` if the image should be refreshed, otherwise `false`.
 */
const shouldRefreshImage = (streamName) => {
  try {
    const timestamp = localStorage.getItem(getTimestampKey(streamName));

    if (!timestamp) return true;

    const lastFetch = parseInt(timestamp, 10);
    const now = Date.now();

    return now - lastFetch > REFRESH_INTERVAL;
  } catch (error) {
    console.error("Error checking timestamp:", error);
    return true;
  }
};

/**
 * Retrieves the thumbnail image for a given stream.
 *
 * This function first checks if the thumbnail image is available in the cache
 * and whether it is still valid. If the cached image is valid, it is returned.
 * Otherwise, it attempts to download a new thumbnail image from the server.
 * If the download fails, it falls back to the cached image (if available) or
 * a placeholder image.
 *
 * @async
 * @param {string} streamName - The name of the stream for which to retrieve the thumbnail.
 * @returns {Promise<string>} A promise that resolves to the URL of the thumbnail image.
 */
export const getThumbnail = async (streamName) => {
  try {
    // Check if the image is already in cache and still valid
    const cachedImage = await getImageFromStorage(streamName);

    // If it's not the placeholder and doesn't need refresh, use the cache
    if (cachedImage !== placeholderImage && !shouldRefreshImage(streamName)) {
      return cachedImage;
    }

    // If there's already a request in progress for this thumbnail, use the cache
    if (pendingRequests.get(streamName)) {
      console.log(`Skipping duplicate thumbnail request for ${streamName}`);
      return cachedImage;
    }

    // Set the request in progress flag
    pendingRequests.set(streamName, true);

    // Set up a timeout to avoid blocking
    const { signal, clearTimeout } = createTimeoutSignal(5000);

    try {
      const response = await fetch(`/v1/ome/streams/${streamName}/thumb.jpg`, {
        signal,
        headers: { "Cache-Control": "no-cache, no-store" },
      });

      if (!response.ok) {
        throw new Error(`Error downloading thumbnail: ${response.status}`);
      }

      const imageBlob = await response.blob();

      // Save image to cache
      const imageUrl = await saveImageToStorage(streamName, imageBlob);

      return imageUrl;
    } catch (error) {
      // Don't log abort errors (they're expected when using timeout)
      if (error.name !== "AbortError") {
        console.error(`Error downloading thumbnail for ${streamName}:`, error);
      }

      // In case of download error, return cached image if available
      // or placeholder if not available
      return cachedImage;
    } finally {
      // Clear the timeout and reset the request flag
      clearTimeout();
      pendingRequests.set(streamName, false);
    }
  } catch (error) {
    console.error(`General error getting thumbnail for ${streamName}:`, error);
    return placeholderImage;
  }
};

/**
 * Sets up a timer to periodically update a stream's thumbnail.
 *
 * @param {string} streamName - The name of the stream for which to set up the timer.
 * @param {Function} onUpdate - Callback function to be called with the updated thumbnail URL.
 * @returns {Object} - An object containing the timer ID and cleanup function.
 */
export const setupThumbnailTimer = (streamName, onUpdate) => {
  let isMounted = true;
  let lastUpdateTime = 0;
  const minUpdateInterval = 2000; // At least 2 seconds between updates

  // Immediately retrieve the image from cache
  getImageFromStorage(streamName).then((cachedImage) => {
    // Update UI with cached image only if component is still mounted
    if (isMounted) {
      onUpdate(cachedImage);
    }

    // Check if an immediate refresh is needed
    if (
      (cachedImage === placeholderImage || shouldRefreshImage(streamName)) &&
      !document.hidden
    ) {
      // Implement a small delay to avoid clustered calls during initialization
      setTimeout(() => {
        if (isMounted && !document.hidden) {
          // Execute request only if necessary and page is visible
          getThumbnail(streamName).then((thumbnailUrl) => {
            if (thumbnailUrl && thumbnailUrl !== cachedImage && isMounted) {
              onUpdate(thumbnailUrl);
              lastUpdateTime = Date.now();
            }
          });
        }
      }, 200);
    }
  });

  // Set a timer to update the thumbnail every 5 minutes
  const timerId = setInterval(() => {
    // If component is unmounted or page not visible, skip update
    if (!isMounted || document.hidden) {
      return;
    }

    // Check if enough time has passed since last update
    const now = Date.now();
    if (now - lastUpdateTime < minUpdateInterval) {
      console.log(`Skipping thumbnail update for ${streamName}, too soon`);
      return;
    }

    if (shouldRefreshImage(streamName)) {
      getThumbnail(streamName).then((thumbnailUrl) => {
        if (thumbnailUrl && isMounted) {
          onUpdate(thumbnailUrl);
          lastUpdateTime = now;
        }
      });
    }
  }, REFRESH_INTERVAL);

  // Return object with timer ID and cleanup function
  return {
    timerId,
    cleanup: () => {
      isMounted = false;
      clearInterval(timerId);
    },
  };
};

/**
 * Cleans up resources for a specific stream's thumbnail.
 *
 * @param {string} streamName - The name of the stream for which to clean up resources.
 * @param {number|Object} timerRef - The timer ID or timer object to clean up.
 */
export const cleanupThumbnail = (streamName, timerRef) => {
  // Clear update timer
  if (!timerRef) return;

  if (typeof timerRef === "number") {
    // For compatibility with previous version
    clearInterval(timerRef);
  } else if (timerRef.cleanup && typeof timerRef.cleanup === "function") {
    // New version with cleanup function
    timerRef.cleanup();
  }

  // Get blob URL to revoke it
  const imageUrl = localStorage.getItem(getStorageKey(streamName));
  if (imageUrl && imageUrl.startsWith("blob:")) {
    try {
      URL.revokeObjectURL(imageUrl);
    } catch (e) {
      console.warn("Error revoking blob URL:", e);
    }
  }
};

/**
 * Cleans up all thumbnail-related data and resources.
 */
export const cleanupAllThumbnails = () => {
  try {
    // Get all keys in localStorage that refer to blob URLs
    const blobUrlKeys = Object.keys(localStorage).filter((key) =>
      key.startsWith(THUMBNAIL_PREFIX)
    );

    // For each key, revoke the blob URL if present
    blobUrlKeys.forEach((key) => {
      const value = localStorage.getItem(key);
      if (value && value.startsWith("blob:")) {
        try {
          URL.revokeObjectURL(value);
        } catch (e) {
          console.warn("Error revoking blob URL:", e);
        }
      }
    });
  } catch (e) {
    console.error("Error cleaning up thumbnails:", e);
  }
};
