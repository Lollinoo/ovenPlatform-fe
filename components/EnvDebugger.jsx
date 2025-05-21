import React, { useState } from 'react';
import config from '../utils/envConfig';
import '../styles/EnvDebugger.css';

/**
 * Environment Variables Debugger Component
 * 
 * This component is only accessible in development mode.
 * Displays all available environment variables with filtering options.
 */
const EnvDebugger = () => {
  const [filter, setFilter] = useState('');
  const [showSecrets, setShowSecrets] = useState(false);
  
  // If in production environment, block access to this page
  if (config.app.isProduction) {
    return (
      <div className="env-debugger-blocked">
        <h1>⚠️ Access Denied</h1>
        <p>The environment variables debugger is only available in development mode.</p>
      </div>
    );
  }
  
  // Collect all VITE_* variables
  const envVars = Object.keys(import.meta.env)
    .filter(key => key.startsWith('VITE_'))
    .sort()
    .map(key => ({
      key,
      value: import.meta.env[key],
      isSecret: key.includes('KEY') || 
                key.includes('SECRET') || 
                key.includes('PASSWORD') || 
                key.includes('CREDENTIAL')
    }));
  
  // Filter based on user input
  const filteredVars = envVars.filter(variable => 
    variable.key.toLowerCase().includes(filter.toLowerCase())
  );
  
  // Mask sensitive values
  const formatValue = (variable) => {
    if (variable.isSecret && !showSecrets) {
      return '••••••••••••••••';
    }
    return variable.value;
  };
  
  return (
    <div className="env-debugger">
      <div className="env-header">
        <h1>Environment Variables Debugger</h1>
        <div className="environment-badge development">
          {config.app.mode}
        </div>
      </div>
      
      <div className="filter-container">
        <input
          type="text"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Filter variables..."
          className="filter-input"
        />
        
        <label className="show-secrets-toggle">
          <input
            type="checkbox"
            checked={showSecrets}
            onChange={() => setShowSecrets(!showSecrets)}
          />
          Show sensitive values
        </label>
      </div>
      
      <div className="env-variables">
        <table>
          <thead>
            <tr>
              <th>Variable</th>
              <th>Value</th>
              <th>Type</th>
            </tr>
          </thead>
          <tbody>
            {filteredVars.length === 0 ? (
              <tr>
                <td colSpan="3" className="no-results">
                  No variables found matching filter: "{filter}"
                </td>
              </tr>
            ) : (
              filteredVars.map(variable => (
                <tr key={variable.key} className={variable.isSecret ? 'secret-var' : ''}>
                  <td className="var-name">{variable.key}</td>
                  <td className="var-value">
                    {formatValue(variable)}
                    {variable.isSecret && (
                      <span className="secret-badge" title="Sensitive value">🔒</span>
                    )}
                  </td>
                  <td className="var-type">{typeof variable.value}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      
      <div className="env-config-preview">
        <h2>Processed Configuration</h2>
        <pre>{JSON.stringify(config, null, 2)}</pre>
      </div>
      
      <div className="env-footer">
        <p><strong>Note:</strong> This page is only visible in development mode.</p>
      </div>
    </div>
  );
};

export default EnvDebugger;
