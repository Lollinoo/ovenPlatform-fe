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
 *
 * Constants:
 * - `THUMBNAIL_PREFIX`: Prefix for thumbnail storage keys.
 * - `TIMESTAMP_PREFIX`: Prefix for timestamp storage keys.
 * - `BLOB_PREFIX`: Prefix for blob storage keys.
 * - `REFRESH_INTERVAL`: Duration (in milliseconds) for refreshing thumbnails.
 *
 * Functions:
 * - `isBlobUrlValid(url)`: Checks if a blob URL is still valid.
 * - `getStorageKey(streamName)`: Generates the storage key for a stream's thumbnail.
 * - `getTimestampKey(streamName)`: Generates the storage key for a stream's timestamp.
 * - `getBlobKey(streamName)`: Generates the storage key for a stream's Base64 blob.
 * - `saveImageToStorage(streamName, imageBlob)`: Saves an image to `localStorage` as Base64 and generates a blob URL.
 * - `blobToBase64(blob)`: Converts a blob to a Base64 string.
 * - `base64ToBlob(base64)`: Converts a Base64 string to a blob.
 * - `getImageFromStorage(streamName)`: Retrieves an image from `localStorage`.
 * - `shouldRefreshImage(streamName)`: Determines if a stream's thumbnail needs to be refreshed.
 * - `getThumbnail(streamName)`: Retrieves the thumbnail for a stream, either from cache or by downloading it.
 * - `setupThumbnailTimer(streamName, onUpdate)`: Sets up a timer to periodically refresh a stream's thumbnail.
 * - `cleanupThumbnail(streamName, timerId)`: Cleans up resources for a specific stream's thumbnail.
 * - `cleanupAllThumbnails()`: Cleans up all thumbnail-related data and resources.
 */
// Utility for managing stream thumbnail fetching and storage
// The service uses localStorage to store images

import placeholderImage from '../assets/thumbnail-placeholder.jpg';

// Prefisso per le chiavi di storage
const THUMBNAIL_PREFIX = 'stream_thumb_';
const TIMESTAMP_PREFIX = 'stream_thumb_time_';
const BLOB_PREFIX = 'stream_blob_';

// Duration of refresh in milliseconds (5 minutes)
const REFRESH_INTERVAL = 5 * 60 * 1000;

// Function to check if a blob URL is still valid
const isBlobUrlValid = (url) => {
  if (!url || !url.startsWith('blob:')) return false;
  
  try {
    // Try to retrieve the blob, if it fails it means it has been revoked
    const xhr = new XMLHttpRequest();
    xhr.open('HEAD', url, false); // synchronous for simplicity
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
    // Convert blob to base64 for better persistence
    const base64String = await blobToBase64(imageBlob);
    
    // Save base64 string to localStorage
    localStorage.setItem(getBlobKey(streamName), base64String);
    
    // Generate a blob URL for immediate use
    const objectUrl = URL.createObjectURL(imageBlob);
    
    // Save the object URL to localStorage for use in current session
    localStorage.setItem(getStorageKey(streamName), objectUrl);
    
    // Save current timestamp
    localStorage.setItem(getTimestampKey(streamName), Date.now().toString());
    
    return objectUrl;
  } catch (error) {
    console.error('Error saving image:', error);
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
    console.error('Error converting base64 to blob:', e);
    return null;
  }
};

// Function to retrieve an image from localStorage
const getImageFromStorage = async (streamName) => {
  try {
    // First check if there's a valid blob URL from current session
    const blobUrl = localStorage.getItem(getStorageKey(streamName));
    
    if (blobUrl && blobUrl.startsWith('blob:') && isBlobUrlValid(blobUrl)) {
      return blobUrl;
    }
    
    // If blob URL is not valid, check if we have base64 data
    const base64Data = localStorage.getItem(getBlobKey(streamName));
    
    if (base64Data && base64Data.startsWith('data:')) {
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
    console.error('Error retrieving image:', error);
    return placeholderImage;
  }
};

// Function to check if image needs to be updated
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
    console.error('Error checking timestamp:', error);
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
 *                             This could be a cached image, a newly downloaded image,
 *                             or a placeholder image in case of errors.
 */
export const getThumbnail = async (streamName) => {
  try {
    // Controlla se l'immagine è già in cache e se è ancora valida
    const cachedImage = await getImageFromStorage(streamName);
    
    // Se non è il placeholder e non è necessario aggiornarla, usa la cache
    if (cachedImage !== placeholderImage && !shouldRefreshImage(streamName)) {
      return cachedImage;
    }
    
    // Otherwise, download a new image
    try {
      const response = await fetch(`/v1/ome/streams/${streamName}/thumb.jpg`);
      
      if (!response.ok) {
        throw new Error(`Error downloading thumbnail: ${response.status}`);
      }
      
      const imageBlob = await response.blob();
      
      // Revoke previous URL if it exists and is a blob
      const oldUrl = localStorage.getItem(getStorageKey(streamName));
      if (oldUrl && oldUrl.startsWith('blob:')) {
        try {
          URL.revokeObjectURL(oldUrl);
        } catch (e) {
          console.warn('Error revoking blob URL:', e);
        }
      }
      
      // Save image to cache
      const imageUrl = await saveImageToStorage(streamName, imageBlob);
      
      return imageUrl;
    } catch (error) {
      console.error(`Error downloading thumbnail for ${streamName}:`, error);
      
      // In case of download error, return cached image if available
      // or placeholder if not available
      return cachedImage;
    }
  } catch (error) {
    console.error(`General error getting thumbnail for ${streamName}:`, error);
    return placeholderImage;
  }
};

// Funzione per impostare timer di aggiornamento per ogni stream
export const setupThumbnailTimer = (streamName, onUpdate) => {
  // Recupera immediatamente l'immagine dalla cache
  getImageFromStorage(streamName).then(cachedImage => {
    // Aggiorna UI con l'immagine dalla cache
    onUpdate(cachedImage);
    
    // Verifica se è necessario un refresh immediato
    if (cachedImage === placeholderImage || shouldRefreshImage(streamName)) {
      // Esegui la richiesta solo se necessario
      getThumbnail(streamName).then(thumbnailUrl => {
        if (thumbnailUrl && thumbnailUrl !== cachedImage) {
          onUpdate(thumbnailUrl);
        }
      });
    }
  });
  
  // Imposta un timer per aggiornare la thumbnail ogni 5 minuti
  const timerId = setInterval(() => {
    if (shouldRefreshImage(streamName)) {
      getThumbnail(streamName).then(thumbnailUrl => {
        if (thumbnailUrl) onUpdate(thumbnailUrl);
      });
    }
  }, REFRESH_INTERVAL);
  
  // Return timer ID for cleanup
  return timerId;
};

// Function to clean up resources when no longer needed
export const cleanupThumbnail = (streamName, timerId) => {
  // Clear update timer
  if (timerId) {
    clearInterval(timerId);
  }
  
  // Get blob URL to revoke it
  const imageUrl = localStorage.getItem(getStorageKey(streamName));
  if (imageUrl && imageUrl.startsWith('blob:')) {
    try {
      URL.revokeObjectURL(imageUrl);
    } catch (e) {
      console.warn('Error revoking blob URL:', e);
    }
  }
};

// Function to clean up all thumbnail data
export const cleanupAllThumbnails = () => {
  try {
    // Get all keys in localStorage that refer to blob URLs
    const blobUrlKeys = Object.keys(localStorage).filter(key => 
      key.startsWith(THUMBNAIL_PREFIX)
    );
    
    // For each key, revoke the blob URL if present
    blobUrlKeys.forEach(key => {
      const value = localStorage.getItem(key);
      if (value && value.startsWith('blob:')) {
        try {
          URL.revokeObjectURL(value);
        } catch (e) {
          console.warn('Error revoking blob URL:', e);
        }
      }
    });
  } catch (e) {
    console.error('Error cleaning up thumbnails:', e);
  }
};