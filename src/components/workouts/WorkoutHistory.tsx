"use client";

import React, { useState, useEffect, useCallback } from 'react';

interface ExerciseInfo { name: string; }
interface WorkoutLogEntry {
    id: number; userId: number; exerciseId: number; date: string;
    sets: number; reps: number; weight: number; createdAt: string;
    exercise: ExerciseInfo;
}
interface GroupedLogs { [dateKey: string]: WorkoutLogEntry[]; }
interface WorkoutHistoryProps { token: string | null; }

const groupLogsByDate = (logs: WorkoutLogEntry[]): GroupedLogs => {
  return logs.reduce((acc, log) => {
    const dateKey = log.date.substring(0, 10);
    if (!acc[dateKey]) { acc[dateKey] = []; }
    acc[dateKey].push(log);
    return acc;
  }, {} as GroupedLogs);
};

const formatDate = (dateString: string): string => {
    try {
       const dateObj = new Date(dateString);
       return dateObj.toLocaleDateString('is-IS', {
            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC'
       });
    } catch { 
        return dateString;
    }
};

const WorkoutHistory: React.FC<WorkoutHistoryProps> = ({ token }) => {
  const [logs, setLogs] = useState<WorkoutLogEntry[]>([]);
  const [groupedLogs, setGroupedLogs] = useState<GroupedLogs>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchHistory = useCallback(async () => {
      if (!token) { setError("Not authenticated."); setLoading(false); return; }
      setLoading(true); setError(null); setLogs([]); setGroupedLogs({});
      try {
          const response = await fetch('/api/workouts', { headers: { 'Authorization': `Bearer ${token}` } });
          const resText = await response.text();
          if (!response.ok) {
              try { throw new Error(JSON.parse(resText)?.error || `HTTP ${response.status}`); }
              catch { throw new Error(`HTTP ${response.status}`); }
          }
          const data = JSON.parse(resText);
          if (Array.isArray(data)) {
              setLogs(data);
              const grouped = groupLogsByDate(data);
              setGroupedLogs(grouped);
          } else { setError("Invalid data format received from server."); }
      } catch (err: unknown) {
          const message = err instanceof Error ? err.message : String(err);
          setError(message || "Failed to load workout history.");
      } finally { setLoading(false); }
  }, [token]);

  useEffect(() => { fetchHistory(); }, [fetchHistory]);

  if (loading) {
      return (
          <div className="loading-container" style={{ minHeight: '150px' }}>
              <img src="/robofit25.png" alt="Loading history..." width="50" height="50" style={{ animation: 'spin 1.5s linear infinite' }} />
          </div>
      );
  }
  if (error) { return <p style={{ color: 'var(--accent-red)' }}>Error: {error}</p>; }
  if (logs.length === 0) { return <p>No workout history found yet.</p>; }

  const sortedDates = Object.keys(groupedLogs).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

  return (
    <div style={{ marginTop: '20px', paddingTop: '15px' }}>
      <h2>Workout History</h2>
      {sortedDates.map(dateKey => (
        <div key={dateKey} className="card" style={{ marginBottom: '20px' }}>
          <h4 style={{ borderBottom: `1px solid var(--background-light)`, paddingBottom: '8px', marginBottom: '10px' }}>
              {formatDate(dateKey)}
          </h4>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {groupedLogs[dateKey].map(log => (
              <li key={log.id} style={{ marginBottom: '8px', paddingBottom: '8px', borderBottom: '1px dotted var(--background-light)' }}>
                <strong style={{ color: 'var(--text-primary)' }}>{log.exercise?.name || 'Unknown Exercise'}:</strong>
                <span style={{ marginLeft: '10px', color: 'var(--text-secondary)' }}>
                    {log.sets} sets x {log.reps} reps @ {log.weight} kg
                </span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
};
export default WorkoutHistory;