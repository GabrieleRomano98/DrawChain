# draw

A "draw and guess" party game React app, scaffolded from `create-react-app` and mimicking the room system from the `wtp` project (Home → Room → Draw), backed by an Express + `express-session` server using Server-Sent Events (SSE) for real-time room updates.

## Flow

1. **Home** — enter your name and either host or join a game (by code).
2. **Room** — waiting room showing the host and joined players. The host can remove players and start the game. Players are notified in real time via SSE.
3. **Draw** — placeholder drawing canvas shown once the host starts the game. Extend this with real-time stroke syncing over the server.

## Scripts

- `npm start` — run the React app locally (proxies API calls to `http://localhost:3001`).
- `npm run server` — run the Express server locally on port 3001.
- `npm run dev` — run both the server and the React app together.
- `npm run build` — build the React app for production.
- `npm run build:production` — build the app and copy the server files into `build/` for deployment.

