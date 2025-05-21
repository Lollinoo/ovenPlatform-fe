// Modal component for creating new live streams
// Handles stream creation workflow, validation, and provides streaming credentials
import { useState, useEffect } from "react";
import "../styles/theme.css";
import "../styles/CreateStreamModal.css";

function CreateStreamModal({ isOpen, onClose, onCreateStream }) {
  const [streamName, setStreamName] = useState("");
  const [error, setError] = useState("");
  const [isWaiting, setIsWaiting] = useState(false);
  const [streamFound, setStreamFound] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [streamData, setStreamData] = useState(null);
  const [copiedDomain, setCopiedDomain] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);
  
  // Stati per la validazione
  const [validation, setValidation] = useState({
    minLength: false,
    noSpaces: false,
    validChars: false,
    isValid: false
  });

  useEffect(() => {
    let pollingInterval;

    if (isWaiting && streamData) {
      pollingInterval = setInterval(async () => {
        try {
          const response = await fetch("/v1/ome/streams");
          if (!response.ok)
            throw new Error("Error checking stream status");

          const streams = await response.json();
          const streamExists = streams.some(
            (stream) => stream.streamName === streamName
          );

          if (streamExists) {
            // Stream found, update state
            setStreamFound(true);
            setIsWaiting(false);
            setShowSuccess(true);
            
            // Notify parent component that the stream was created and detected
            // Pass updated streams data for immediate refresh
            onCreateStream({
              ...streamData,
              streamFound: true,
              streams: streams
            });
            
            clearInterval(pollingInterval);
          }
        } catch (err) {
          setError("Error checking stream status");
          setIsWaiting(false);
          clearInterval(pollingInterval);
        }
      }, 2000);
    }

    return () => {
      if (pollingInterval) clearInterval(pollingInterval);
    };
  }, [isWaiting, streamName, streamData, onCreateStream]);

  useEffect(() => {
    if (!isOpen) {
      setStreamName("");
      setError("");
      setIsWaiting(false);
      setStreamFound(false);
      setShowSuccess(false);
      setStreamData(null);
      // Reset della validazione
      setValidation({
        minLength: false,
        noSpaces: false,
        validChars: false,
        isValid: false
      });
    }
  }, [isOpen]);

  const resetForm = () => {
    setStreamName("");
    setError("");
    setIsWaiting(false);
    setStreamFound(false);
    setShowSuccess(false);
    setStreamData(null);
    setCopiedDomain(false);
    setCopiedKey(false);
    // Reset della validazione
    setValidation({
      minLength: false,
      noSpaces: false,
      validChars: false,
      isValid: false
    });
  };
  
  // Funzione per validare il nome della stream in tempo reale
  const validateStreamName = (name) => {
    // Controlla lunghezza minima (8 caratteri)
    const hasMinLength = name.length >= 8;
    
    // Controlla che non ci siano spazi
    const hasNoSpaces = !/\s/.test(name);
    
    // Controlla caratteri validi (solo alfanumerici, trattini e underscore)
    const hasValidChars = /^[a-zA-Z0-9_-]+$/.test(name);
    
    // Aggiorna lo stato di validazione
    const isValid = hasMinLength && hasNoSpaces && hasValidChars;
    
    setValidation({
      minLength: hasMinLength,
      noSpaces: hasNoSpaces,
      validChars: hasValidChars,
      isValid
    });
    
    return isValid;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const trimmedStreamName = streamName.trim();

    // Valida nuovamente prima di inviare
    if (!validateStreamName(trimmedStreamName)) {
      setError("Please ensure the stream name meets all requirements");
      return;
    }

    try {
      setIsWaiting(true);
      setError("");

      // Post request to create a new stream
      // and get the signed URL
      // Example: POST /v1/ome/streams/generate-signed-url
      const response = await fetch("/v1/ome/streams/generate-signed-url", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ streamName: trimmedStreamName }),
      });

      if (response.status === 409) {
        throw new Error("Stream already exists. Change name.");
      }
      if (!response.ok) {
        throw new Error("Error creating stream");
      }

      const data = await response.json();
      
      // Split the signed URL to get the domain and stream key
      // Example: rtmp://example.com/live/streamKey
      const rtmpUrl = data.signedUrl;
      const lastSlashIndex = rtmpUrl.lastIndexOf('/');
      const rtmpDomain = rtmpUrl.substring(0, lastSlashIndex+1);
      const streamKey = rtmpUrl.substring(lastSlashIndex+1);

      const newStreamData = {
        rtmpDomain,
        streamKey
      };

      setStreamName(trimmedStreamName);
      setStreamData(newStreamData);
      
      // Notify parent component about the new stream
      onCreateStream({
        ...newStreamData,
        streamName: trimmedStreamName,
        status: 'creating'
      });
    } catch (err) {
      setError("Errore: " + err.message);
      setIsWaiting(false);
    }
  };
  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h2>Create New Stream</h2>
          <button 
            type="button" 
            onClick={onClose} 
            className="close-modal-button"
            title="Close"
          >
            ✕
          </button>
        </div>
        <div className="encoder-info">
          <h3>Supported Encoders</h3>
          <div className="encoder-list">
            <div className="encoder-item">
              <span className="encoder-name">OBS</span>
              <span className="encoder-type">RTMP</span>
            </div>
          </div>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="streamName">Stream Name:</label>
            <input
              type="text"
              id="streamName"
              value={streamName}
              onChange={(e) => {
                const newValue = e.target.value;
                setStreamName(newValue);
                validateStreamName(newValue);
              }}
              placeholder="Enter stream name"
              disabled={isWaiting || streamData}
            />
          </div>
          
          {/* Indicatori di validazione con icone migliorate */}
          {!streamData && (
            <div className="validation-requirements">
              <p className="validation-title">Stream name requirements:</p>
              <ul className="validation-list">
                <li className={validation.minLength ? "valid" : "invalid"}>
                  <span className="validation-icon">{validation.minLength ? "✓" : "✗"}</span>
                  Minimum 8 characters
                </li>
                <li className={validation.noSpaces ? "valid" : "invalid"}>
                  <span className="validation-icon">{validation.noSpaces ? "✓" : "✗"}</span>
                  No spaces
                </li>
                <li className={validation.validChars ? "valid" : "invalid"}>
                  <span className="validation-icon">{validation.validChars ? "✓" : "✗"}</span>
                  Only letters, numbers, hyphens and underscores
                </li>
              </ul>
            </div>
          )}
          
          {error && (
            <div className="error-message">
              <div className="error-icon">!</div>
              <p>{error}</p>
            </div>
          )}
          {streamData && (
            <div className="stream-urls">
              <div className="url-group">
                <h3>URL Server</h3>
                <div className="url-box">
                  <p>{streamData.rtmpDomain}</p>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    navigator.clipboard.writeText(streamData.rtmpDomain);
                    setCopiedDomain(true);
                    setTimeout(() => setCopiedDomain(false), 2000);
                  }}
                  className={`copy-button ${copiedDomain ? 'copied' : ''}`}
                >
                  {copiedDomain ? 'Copied!' : 'Copy Stream URL'}
                </button>
              </div>
              <div className="url-group">
                <h3>Stream Key</h3>
                <div className="url-box">
                  <p>{streamData.streamKey}</p>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    navigator.clipboard.writeText(streamData.streamKey);
                    setCopiedKey(true);
                    setTimeout(() => setCopiedKey(false), 2000);
                  }}
                  className={`copy-button ${copiedKey ? 'copied' : ''}`}
                >
                  {copiedKey ? 'Copied!' : 'Copy Stream Key'}
                </button>
              </div>
            </div>
          )}
          {isWaiting && (
            <div className="waiting-message">
              <div className="spinner"></div>
              <p>Waiting for stream to start...</p>
            </div>
          )}
          {showSuccess && (
            <div className="success-message">
              <div className="success-icon">✓</div>
              <p>Stream detected successfully!</p>
            </div>
          )}
          <div className="modal-actions">
            {showSuccess || (streamData && !isWaiting) ? (
              <button 
                type="button" 
                onClick={() => {
                  // If the stream has already been detected, make sure the list is updated
                  if (showSuccess) {
                    // Request a final stream update before closing
                    fetch("/v1/ome/streams")
                      .then(response => {
                        if (response.ok) return response.json();
                        return [];
                      })
                      .then(streams => {
                        onCreateStream({ streams });
                        onClose();
                      })
                      .catch(() => {
                        onClose();
                      });
                  } else {
                    onClose();
                  }
                }} 
                className="close-button"
              >
                {showSuccess ? "Close" : "Close"}
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={onClose}
                  className="cancel-button"
                  disabled={isWaiting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={`create-button ${!validation.isValid ? 'disabled' : ''}`}
                  disabled={isWaiting || !validation.isValid}
                >
                  {isWaiting ? "Creating stream..." : "Crea Stream"}
                </button>
              </>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}

export default CreateStreamModal;
