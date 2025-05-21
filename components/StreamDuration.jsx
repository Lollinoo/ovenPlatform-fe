import { useState, useEffect } from "react";
import {
  setupDurationTimer,
  cleanupDurationTimer,
} from "../utils/streamInfoService";

/**
 * Component that displays a real-time updating duration since a given start time
 * Used for showing how long a stream has been active
 *
 * @param {Object} props - Component props
 * @param {Date|string|number} props.startTime - The start time of the stream
 * @returns {JSX.Element} - Rendered component
 */
function StreamDuration({ startTime }) {
  const [duration, setDuration] = useState("00:00:00");

  useEffect(() => {
    // Don't set up timer if no valid start time
    if (!startTime) {
      setDuration("00:00:00");
      return;
    }

    // Set up timer to update duration every second
    const timerId = setupDurationTimer(setDuration, startTime);

    // Clean up on unmount
    return () => {
      cleanupDurationTimer(timerId);
    };
  }, [startTime]);

  return <span className="stream-duration">{duration}</span>;
}

export default StreamDuration;
