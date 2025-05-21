#!/bin/sh
echo "Starting OvenPlatform Frontend..."

if [ -f .env ]; then
  echo "Found .env file, using environment variables from file"
else
  echo "No .env file found, using environment variables from container"
  echo "VITE_APP_NAME=${VITE_APP_NAME:-OvenPlatform}" > .env
  echo "VITE_WEBRTC_URL_BASE=${VITE_WEBRTC_URL_BASE:-wss://stream.example.com/app}" >> .env
  echo "VITE_LLHLS_URL_BASE=${VITE_LLHLS_URL_BASE:-https://stream.example.com/app}" >> .env
  echo "VITE_TURN_SERVER_URL_UDP=${VITE_TURN_SERVER_URL_UDP:-turn:turn.example.com:3478}" >> .env
  echo "VITE_TURN_SERVER_URL_TCP=${VITE_TURN_SERVER_URL_TCP:-turn:turn.example.com:3478?transport=tcp}" >> .env
  echo "VITE_TURN_SERVER_USERNAME=${VITE_TURN_SERVER_USERNAME:-username}" >> .env
  echo "VITE_TURN_SERVER_CREDENTIAL=${VITE_TURN_SERVER_CREDENTIAL:-password}" >> .env
  echo "VITE_MODE=${VITE_MODE:-production}" >> .env
fi

echo "Environment configuration complete"
echo "Starting web server..."

exec serve -s dist -l 4173
