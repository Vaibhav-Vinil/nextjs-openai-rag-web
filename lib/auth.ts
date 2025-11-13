import { randomBytes } from "crypto";

// Simple in-memory storage for demo purposes only.
// In production, replace with a persistent/session store and proper password hashing.
export interface UserSession {
  sessionId: string;
  username: string;
  createdAt: number;
}

// Simple user store - in production, use a database
// Default credentials: username: "admin", password: "password"
const userStore = new Map<string, string>([
  ["admin", "password"], // In production, store hashed passwords
]);

const userSessions = new Map<string, UserSession>();

export async function authenticateUser(
  username: string,
  password: string
): Promise<UserSession | null> {
  const storedPassword = userStore.get(username);
  
  if (!storedPassword || storedPassword !== password) {
    return null;
  }

  const sessionId = randomBytes(16).toString("hex");
  const session: UserSession = {
    sessionId,
    username,
    createdAt: Date.now(),
  };

  userSessions.set(sessionId, session);
  return session;
}

export function getUserSession(sessionId: string): UserSession | undefined {
  return userSessions.get(sessionId);
}

export function clearUserSession(sessionId: string): void {
  userSessions.delete(sessionId);
}

// Helper to check if user is authenticated (for server components)
export async function isAuthenticated(): Promise<boolean> {
  const { cookies } = await import("next/headers");
  const jar = await cookies();
  const sessionId = jar.get("auth_session")?.value;
  
  if (!sessionId) return false;
  
  return userSessions.has(sessionId);
}

