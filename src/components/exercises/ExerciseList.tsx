"use client";

import React, { useState, useEffect, useCallback } from 'react';

interface Exercise {
  id: number;
  name: string;
  description?: string | null;
  userId?: number | null;
}
interface ExerciseListProps {
  token: string | null;
  onLogExercise: (exerciseId: number) => void;
  onExerciseDeleted?: () => void;
  loggedInUserId?: number | null;
}

const ExerciseList: React.FC<ExerciseListProps> = ({ token, onLogExercise, onExerciseDeleted, loggedInUserId }) => {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  // Nota useCallback til að sækja æfingar
  const fetchExercises = useCallback(async () => {
    if (!token) { setError("Not authenticated"); setLoading(false); return; }
    setLoading(true); setError(null);
    try {
      const response = await fetch('/api/exercises', { headers: { 'Authorization': `Bearer ${token}` } });
      const resText = await response.text();
      if (!response.ok) { throw new Error(JSON.parse(resText)?.error || `HTTP ${response.status}`); }
      const data = JSON.parse(resText);
      setExercises(Array.isArray(data) ? data : []);
    } catch (err: unknown) { 
      const message = err instanceof Error ? err.message : String(err); 
      setError(message || "Failed to load exercises");
      setExercises([]);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { fetchExercises(); }, [fetchExercises]);

  // Nota useCallback til að eyða æfingu
  const handleDeleteClick = useCallback(async (exerciseId: number, exerciseName: string) => {
    if (deletingId || !token) return;
    if (!confirm(`Are you sure you want to delete "${exerciseName}"?`)) return;
    setDeletingId(exerciseId); setError(null);
    try {
      const response = await fetch(`/api/exercises/${exerciseId}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
      if (!response.ok && response.status !== 204) {
          const resText = await response.text();
          try { throw new Error(JSON.parse(resText)?.error || `HTTP ${response.status}`); }
          catch { throw new Error(`HTTP ${response.status}`); }
      }
      setExercises(prev => prev.filter(ex => ex.id !== exerciseId));
      if (onExerciseDeleted) onExerciseDeleted();
    } catch (err: unknown) { // Nota unknown
      const message = err instanceof Error ? err.message : String(err); // Type guard
      setError(message || "Failed to delete exercise.");
      setTimeout(() => setError(null), 5000);
    } finally {
      setDeletingId(null);
    }
  }, [token, deletingId, onExerciseDeleted]); // Bæta við dependencies

  // Sýna loading mynd ef loading er true og engar æfingar eru ennþá í listanum
  if (loading && exercises.length === 0) {
    return (
      <div className="loading-container" style={{ minHeight: '150px' }}>
          <img src="/robofit25.png" alt="Loading exercises..." width="50" height="50" style={{ animation: 'spin 1.5s linear infinite' }} />
      </div>
    );
  }

  // Sýna villu ef villa kom upp við fyrsta load
  if (error && exercises.length === 0) {
    return <p style={{ color: 'var(--accent-red)' }}>Error: {error}</p>;
  }

  // Sýna skilaboð ef engar æfingar fundust
  if (exercises.length === 0 && !loading) {
    return <p>No exercises found. Add one above!</p>;
  }

  // Sýna listann
  return (
    <div style={{ marginTop: 'var(--padding-base)' }}>
      {error && !deletingId && (
        <p style={{ color: 'var(--accent-red)', marginBottom: '10px' }}>Error: {error}</p>
      )}
      <ul style={{ listStyle: 'none', padding: 0 }}>
        {exercises.map(exercise => {
          const isDeleting = deletingId === exercise.id;
          const canDelete = exercise.userId === loggedInUserId;
          return (
            <li
              key={exercise.id}
              style={{
                padding: '10px 15px', marginBottom: '8px', backgroundColor: 'var(--background-light)',
                borderRadius: 'var(--border-radius)', transition: 'background-color 0.2s ease, opacity 0.3s ease',
                border: '1px solid transparent', display: 'flex', justifyContent: 'space-between',
                alignItems: 'center', opacity: isDeleting ? 0.5 : 1,
              }}
            >
              <div
                onClick={() => !isDeleting && onLogExercise(exercise.id)}
                style={{ cursor: 'pointer', flexGrow: 1, marginRight: '10px' }}
                onMouseEnter={(e) => !isDeleting && (e.currentTarget.parentElement!.style.backgroundColor = 'var(--background-medium)')}
                onMouseLeave={(e) => !isDeleting && (e.currentTarget.parentElement!.style.backgroundColor = 'var(--background-light)')}
              >
                <span style={{ fontWeight: '500' }}>{exercise.name}</span>
                {exercise.description && ( <small style={{ display: 'block', color: 'var(--text-secondary)', marginTop: '4px' }}> {exercise.description} </small> )}
              </div>
              {canDelete && (
                <button
                  onClick={() => handleDeleteClick(exercise.id, exercise.name)}
                  disabled={isDeleting} title="Delete this exercise"
                  style={{
                    padding: '4px 8px', fontSize: '0.8em', backgroundColor: 'transparent',
                    color: 'var(--text-secondary)', border: '1px solid transparent', marginLeft: '10px', flexShrink: 0,
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--accent-red)'; e.currentTarget.style.borderColor = 'var(--accent-red)';}}
                  onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-secondary)'; e.currentTarget.style.borderColor = 'transparent';}}
                >
                  {isDeleting ? '...' : '✕'}
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
};

export default ExerciseList;