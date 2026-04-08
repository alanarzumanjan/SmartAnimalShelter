#!/bin/bash

PORT=5000
echo "🔍 Port check $PORT..."

PID=$(sudo lsof -t -i:$PORT 2>/dev/null)

if [ -n "$PID" ]; then
    echo "⚠️ Port is occupied by process $PID. Killing..."
    sudo kill -9 $PID 2>/dev/null
    sleep 0.5
    echo "✅ Port is now free."
else
    echo "✅ Port is free."
fi

echo "🚀 Run..."
dotnet run