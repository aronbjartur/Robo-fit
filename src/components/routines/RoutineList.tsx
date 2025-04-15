"use client";

import React, { useState, useEffect, useCallback } from 'react';

interface Routine { id: number; name: string; isDefault: boolean; userId: number | null; exercises: { id: number; order: number | null; exercise: { id: number; name: string; } }[]; }
interface RoutineListProps {
  token: string | null;
  onCreateRoutine: () => void;
  onRoutineDeleted?: () => void;
  loggedInUserId?: number | null;
}

const RoutineList: React.FC<RoutineListProps> = ({ token, onCreateRoutine, onRoutineDeleted, loggedInUserId }) => {
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const fetchRoutines = useCallback(async () => {
    if (!token) { setError("Not authenticated"); setLoading(false); return; }
    setLoading(true); setError(null);
    try {
      const response = await fetch('/api/routines', { headers: { 'Authorization': `Bearer ${token}` } });
      const resText = await response.text();
      if (!response.ok) throw new Error(JSON.parse(resText)?.error || `HTTP ${response.status}`);
      const data = JSON.parse(resText);
      setRoutines(Array.isArray(data) ? data : []);
    } catch (err: unknown) { // Nota unknown
      const message = err instanceof Error ? err.message : String(err); // Type guard
      setError(message || "Failed to load routines");
      setRoutines([]);
    } finally { setLoading(false); }
  }, [token]);

  useEffect(() => { fetchRoutines(); }, [fetchRoutines]);

  const handleDeleteClick = async (routineId: number, routineName: string) => {
    if (deletingId || !token) return;
    if (!confirm(`Delete routine "${routineName}"?`)) return;
    setDeletingId(routineId); setError(null);
    try {
      const response = await fetch(`/api/routines/${routineId}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
      if (!response.ok && response.status !== 204) {
          const resText = await response.text();
          try { throw new Error(JSON.parse(resText)?.error || `HTTP ${response.status}`); }
          catch { throw new Error(`HTTP ${response.status}`); }
        }
      setRoutines(prev => prev.filter(r => r.id !== routineId));
      if (onRoutineDeleted) onRoutineDeleted();
    } catch (err: unknown) { // Nota unknown
      const message = err instanceof Error ? err.message : String(err); // Type guard
      setError(message || "Failed to delete routine.");
      setTimeout(() => setError(null), 5000);
    } finally { setDeletingId(null); }
  };

  if (loading && routines.length === 0) {
      return (
          <div className="loading-container" style={{ minHeight: '150px' }}>
              <img src="/robofit25.png" alt="Loading routines..." width="50" height="50" style={{ animation: 'spin 1.5s linear infinite' }} />
          </div>
      );
  }
  if (error && routines.length === 0) { return <p style={{ color: 'var(--accent-red)' }}>Error: {error}</p>; }

  return (
    <div style={{ marginTop: 'var(--padding-base)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <button onClick={onCreateRoutine} title="Create new routine"> + Create Routine </button>
      </div>
       {error && !deletingId && <p style={{ color: 'var(--accent-red)', marginBottom: '10px' }}>Error: {error}</p>}
      {routines.length === 0 && !loading && <p>No routines found. Create your first one!</p>}
      {routines.map(routine => {
         const isDeleting = deletingId === routine.id;
         const canDelete = routine.userId === loggedInUserId;
         return (
            <div key={routine.id} className="card" style={{ marginBottom: '1rem', opacity: isDeleting ? 0.5 : 1, transition: 'opacity 0.3s ease' }} >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <h4 style={{ margin: 0 }}> {routine.name} {!canDelete && routine.isDefault ? '(Default)' : ''} </h4>
                  <div>
                    {canDelete && ( <button onClick={() => handleDeleteClick(routine.id, routine.name)} disabled={isDeleting} title="Delete" style={{ padding: '4px 8px', fontSize: '0.8em', backgroundColor: 'transparent', color: 'var(--text-secondary)'}} onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--accent-red)';}} onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-secondary)';}} > {isDeleting ? '...' : '✕'} </button> )}
                  </div>
              </div>
              {routine.exercises && routine.exercises.length > 0 ? (
                <ul style={{ listStyle: 'disc', paddingLeft: '20px', margin: '0', fontSize: '0.9em', color: 'var(--text-secondary)' }}>
                  {routine.exercises.map(link => ( <li key={link.id}> {link.exercise?.name || 'Unknown Exercise'} </li> ))}
                </ul> ) : ( <p><small>No exercises linked.</small></p> )}
            </div> );
        })}
    </div>
  );
};
export default RoutineList;