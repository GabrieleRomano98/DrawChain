// API base — points to the Express server (see server/server.js).
// In development the server runs on localhost:3001 while CRA serves on 3000.
// In production the server serves the built app itself, so requests are relative.
const API_BASE =
  process.env.NODE_ENV === "production" ? "" : "http://localhost:3001";

async function request(url, options = {}) {
  const res = await fetch(`${API_BASE}${url}`, {
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    ...options
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.success === false) {
    throw new Error(data.message || `HTTP ${res.status}`);
  }
  return data;
}

export const api = {
  async createGame(name) {
    return request("/api/game/create", {
      method: "POST",
      body: JSON.stringify({ name })
    });
  },

  async joinGame(gameCode, name) {
    return request(`/api/game/join/${gameCode.toUpperCase()}`, {
      method: "POST",
      body: JSON.stringify({ name })
    });
  },

  async deletePlayer(index) {
    return request(`/api/game/player/${index}`, { method: "DELETE" });
  },

  async getRoomInfo() {
    return request("/api/roomInfo", { method: "GET" });
  },

  async startGame() {
    return request("/api/game/start", { method: "GET" });
  },

  async getTurnInfo() {
    return request("/api/game/turn", { method: "GET" });
  },

  async submitTurn(value) {
    return request("/api/game/submit", {
      method: "POST",
      body: JSON.stringify({ value })
    });
  },

  async getSummary() {
    return request("/api/game/summary", { method: "GET" });
  },

  // Server-Sent Events connection for real-time room notifications.
  // Returns { close() } so callers can tear it down on unmount.
  setEventSource(callback) {
    const eventSource = new EventSource(`${API_BASE}/api/game/notifications`, {
      withCredentials: true
    });

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        callback(data);
      } catch (e) {
        console.error("SSE parse error:", e);
      }
    };

    eventSource.onerror = (err) => console.error("SSE error:", err);

    return { close: () => eventSource.close() };
  }
};

export default api;
