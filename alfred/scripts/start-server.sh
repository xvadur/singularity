#!/bin/bash

# Task Monitor Web Server Startup Script

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SERVER_SCRIPT="$SCRIPT_DIR/../server-fixed.js"
LOG_FILE="$HOME/.openclaw/task-monitor-server.log"
PID_FILE="$HOME/.openclaw/task-monitor-server.pid"

# Check if already running
if [ -f "$PID_FILE" ]; then
  PID=$(cat "$PID_FILE")
  if ps -p "$PID" > /dev/null 2>&1; then
    echo "Server already running with PID $PID"
    exit 0
  else
    rm "$PID_FILE"
  fi
fi

# Start server in background
echo "Starting Task Monitor Web Server..."
nohup node "$SERVER_SCRIPT" >> "$LOG_FILE" 2>&1 &
echo $! > "$PID_FILE"

PID=$(cat "$PID_FILE")

# Basic health check (avoid leaving stale PID file)
sleep 0.4
if ! ps -p "$PID" > /dev/null 2>&1; then
  echo "Server failed to start (process exited immediately)."
  echo "Last logs:"
  tail -n 30 "$LOG_FILE" 2>/dev/null || true
  rm -f "$PID_FILE"
  exit 1
fi

if command -v curl >/dev/null 2>&1; then
  if ! curl -s --max-time 2 http://localhost:3030/health >/dev/null 2>&1; then
    echo "Server started (PID $PID) but /health is not responding yet."
    echo "Last logs:"
    tail -n 30 "$LOG_FILE" 2>/dev/null || true
  fi
fi

echo "Server started with PID $PID"
echo "Logs: $LOG_FILE"
echo "Access: http://localhost:3030 (and https://alfred.xvadur.com via tunnel)"
