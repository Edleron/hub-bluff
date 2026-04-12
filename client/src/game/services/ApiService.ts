const API_BASE = import.meta.env.VITE_SERVER_URL || "http://localhost:3001";

interface AuthResponse {
  token: string;
  playerId: string;
  nickname: string;
  roomId: string;
  serverVersion: string;
  isHost: boolean;
}

interface CreateRoomResponse {
  roomId: string;
  code: string;
}

interface JoinRoomResponse {
  roomId: string;
  code: string;
  playerCount: number;
}

interface RoomListItem {
  id: string;
  code: string;
  playerCount: number;
  maxPlayers: number;
}

async function post<T>(
  path: string,
  body?: unknown,
  token?: string,
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(err.message || res.statusText);
  }
  return res.json() as Promise<T>;
}

async function get<T>(path: string, token?: string): Promise<T> {
  const headers: Record<string, string> = {};
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  const res = await fetch(`${API_BASE}${path}`, { headers });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(err.message || res.statusText);
  }
  return res.json() as Promise<T>;
}

export const apiService = {
  login(token: string): Promise<AuthResponse> {
    return post<AuthResponse>("/auth/login", { token });
  },

  createRoom(token: string): Promise<CreateRoomResponse> {
    return post<CreateRoomResponse>("/rooms", undefined, token);
  },

  joinRoom(roomId: string, token: string): Promise<JoinRoomResponse> {
    return post<JoinRoomResponse>(`/rooms/${roomId}/join`, undefined, token);
  },

  listRooms(token?: string): Promise<RoomListItem[]> {
    return get<RoomListItem[]>("/rooms", token);
  },
};
