const SESSION_LOGS_KEY = "cfs_session_logs";

export interface SessionLog {
  userId: string;
  loginTime: string;
  logoutTime: string | null;
  durationMinutes: number | null;
  device: "Mobile" | "Desktop";
}

export function recordSessionStart(userId: string): void {
  const logs: SessionLog[] = getSessionLogs();
  const now = new Date().toISOString();
  for (const l of logs) {
    if (l.userId === userId && !l.logoutTime) {
      l.logoutTime = now;
      const diff =
        new Date(l.logoutTime).getTime() - new Date(l.loginTime).getTime();
      l.durationMinutes = Math.round((diff / 60000) * 10) / 10;
    }
  }
  const session: SessionLog = {
    userId,
    loginTime: now,
    logoutTime: null,
    durationMinutes: null,
    device: window.innerWidth < 768 ? "Mobile" : "Desktop",
  };
  logs.push(session);
  localStorage.setItem(SESSION_LOGS_KEY, JSON.stringify(logs));
}

export function recordSessionEnd(userId: string): void {
  const logs: SessionLog[] = getSessionLogs();
  const now = new Date().toISOString();
  for (const l of logs) {
    if (l.userId === userId && !l.logoutTime) {
      l.logoutTime = now;
      const diff = new Date(now).getTime() - new Date(l.loginTime).getTime();
      l.durationMinutes = Math.round((diff / 60000) * 10) / 10;
    }
  }
  localStorage.setItem(SESSION_LOGS_KEY, JSON.stringify(logs));
}

export function getSessionLogs(): SessionLog[] {
  try {
    return JSON.parse(localStorage.getItem(SESSION_LOGS_KEY) || "[]");
  } catch {
    return [];
  }
}

export function clearSessionLogs(): void {
  localStorage.removeItem(SESSION_LOGS_KEY);
}
