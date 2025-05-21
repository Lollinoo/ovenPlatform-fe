import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import '../styles/HomePage.css';

function HomePage() {
  const { isAuthenticated } = useAuth();

  return (
    <div className="home-container">
      <section className="hero-section">
        <h1 className="hero-title">Welcome to OvenPlatform</h1>
        <p className="hero-subtitle">
          The next-generation streaming platform with low-latency playback and advanced broadcasting features for creators and viewers.
        </p>
        <div>
          {isAuthenticated ? (
            <Link to="/streams" className="hero-cta">
              Go to Streams
            </Link>
          ) : (
            <>
              <Link to="/login" className="hero-cta">
                Log In
              </Link>
              <Link to="/register" className="hero-cta secondary">
                Sign Up
              </Link>
            </>
          )}
        </div>
      </section>

      <section className="features-section">
        <h2 className="section-title">Key Features</h2>
        <div className="features-grid">
          <div className="feature-card">
            <div className="feature-icon">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                <path d="M4 8H2v12a2 2 0 0 0 2 2h12v-2H4z"></path>
                <path d="M20 2H8a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2zm-9 12V6l7 4z"></path>
              </svg>
            </div>
            <h3 className="feature-title">Ultra Low Latency</h3>
            <p className="feature-description">
              Experience real-time streaming with sub-second latency using cutting-edge WebRTC and LL-HLS technologies.
            </p>
          </div>

          <div className="feature-card">
            <div className="feature-icon">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z"></path>
              </svg>
            </div>
            <h3 className="feature-title">Secure Streaming</h3>
            <p className="feature-description">
              Protect your content with advanced security features including signed URLs and token-based authentication.
            </p>
          </div>

          <div className="feature-card">
            <div className="feature-icon">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                <path d="M21 3H3c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H3V5h18v14zM8 15c0-1.66 1.34-3 3-3 .35 0 .69.07 1 .18V6h5v2h-3v7.03c-.02 1.64-1.35 2.97-3 2.97-1.66 0-3-1.34-3-3z"></path>
              </svg>
            </div>
            <h3 className="feature-title">Multi-platform</h3>
            <p className="feature-description">
              Stream and watch on any device with our responsive player that adapts to various screen sizes and network conditions.
            </p>
          </div>
        </div>
      </section>

      <section className="cta-section">
        <h2 className="cta-title">Ready to start streaming?</h2>
        <p className="cta-description">
          Join thousands of creators who use OvenPlatform to connect with their audience through high-quality, low-latency streams.
        </p>
        {isAuthenticated ? (
          <Link to="/streams" className="hero-cta">
            Go to Streams
          </Link>
        ) : (
          <Link to="/register" className="hero-cta">
            Create Account
          </Link>
        )}
      </section>
    </div>
  );
}

export default HomePage;
