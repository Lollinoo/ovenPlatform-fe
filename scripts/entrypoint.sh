#!/bin/sh
echo "Starting OvenPlatform Frontend..."

export DOCKER_BUILD=true

# Define config file path
ENV_FILE="/app/.env"

echo "Checking for environment configurations..."

# Priority 1: Check for existing .env file in app root
elif [ -f "$ENV_FILE" ]; then
  echo "Using existing .env file at $ENV_FILE"

# Priority 2: Generate .env file from container environment variables
else
  echo "Generating .env file from container environment variables"
  
  # Create .env file with all environment variables starting with VITE_
  env | grep "^VITE_" > "$ENV_FILE"
  
  # If .env file is empty or not created, add default values
  if [ ! -s "$ENV_FILE" ]; then
    echo "VITE_APP_NAME=${VITE_APP_NAME:-OvenPlatform}" > "$ENV_FILE"
    echo "VITE_MODE=${VITE_MODE:-production}" >> "$ENV_FILE"
    echo "VITE_WEBRTC_URL_BASE=${VITE_WEBRTC_URL_BASE:-wss://stream.example.com/app}" >> "$ENV_FILE"
    echo "VITE_LLHLS_URL_BASE=${VITE_LLHLS_URL_BASE:-https://stream.example.com/app}" >> "$ENV_FILE"
    echo "VITE_TURN_SERVER_URL_UDP=${VITE_TURN_SERVER_URL_UDP:-turn:turn.example.com:3478}" >> "$ENV_FILE"
    echo "VITE_TURN_SERVER_URL_TCP=${VITE_TURN_SERVER_URL_TCP:-turn:turn.example.com:3478?transport=tcp}" >> "$ENV_FILE"
    echo "VITE_TURN_SERVER_USERNAME=${VITE_TURN_SERVER_USERNAME:-username}" >> "$ENV_FILE"
    echo "VITE_TURN_SERVER_CREDENTIAL=${VITE_TURN_SERVER_CREDENTIAL:-password}" >> "$ENV_FILE"
    echo "VITE_DEBUG_ENABLED=${VITE_DEBUG_ENABLED:-false}" >> "$ENV_FILE"
    echo "VITE_LOG_LEVEL=${VITE_LOG_LEVEL:-info}" >> "$ENV_FILE"
  fi
fi

echo "Current environment configuration:"
cat "$ENV_FILE" | grep -v "PASSWORD\|CREDENTIAL\|SECRET\|KEY" | sed 's/^/  /'
echo "  [Sensitive values hidden]"

echo "Environment configuration complete"
echo "Starting web server..."

exec serve -s dist -l 4173
