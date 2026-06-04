#!/bin/bash
# Start StudySynth (backend + frontend)
# Usage: ./start.sh

if [ ! -f backend/.env ]; then
  echo "ERROR: backend/.env not found. Copy backend/.env.example and add your ANTHROPIC_API_KEY."
  exit 1
fi

if ! grep -q "ANTHROPIC_API_KEY=sk-" backend/.env 2>/dev/null; then
  echo "WARNING: ANTHROPIC_API_KEY doesn't look set in backend/.env"
fi

echo "Starting backend on :3001..."
(cd backend && npm start) &
BACKEND_PID=$!

echo "Starting frontend on :5173..."
(cd frontend && npm run dev) &
FRONTEND_PID=$!

echo ""
echo "  StudySynth running at http://localhost:5173"
echo "  Press Ctrl+C to stop both servers"
echo ""

trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null" EXIT
wait
