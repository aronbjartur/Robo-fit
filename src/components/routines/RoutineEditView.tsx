"use client";

import React, { useState, useEffect, useCallback } from 'react';

interface SelectableExercise { id: number; name: string; }
interface RoutineEditViewProps {
  token: string | null;
  onRoutineSaved: () => void;
}
type ErrorDetails = { [key: string]: string[] | undefined } | undefined;

interface ErrorWithDetails extends Error {
  details?: ErrorDetails;
}

const RoutineEditView: React.FC<RoutineEditViewProps> = ({ token, onRoutineSaved }) => {
  const [routineName, setRoutineName] = useState('');
  const [availableExercises, setAvailableExercises] = useState<SelectableExercise[]>([]);
  const [selectedExerciseIds, setSelectedExerciseIds] = useState<Set<number>>(new Set());
  const [loadingExercises, setLoadingExercises] = useState(true);
  const [errorExercises, setErrorExercises] = useState<string | null>(null);
  const [loadingSubmit, setLoadingSubmit] = useState(false);
  const [errorSubmit, setErrorSubmit] = useState<string | null>(null);

  const fetchExercises = useCallback(async () => {
     if (!token) { setErrorExercises("Not authenticated"); setLoadingExercises(false); return; }
     setLoadingExercises(true); setErrorExercises(null);
     try {
       const response = await fetch('/api/exercises', { headers: { 'Authorization': `Bearer ${token}` } });
       const resText = await response.text();
       if (!response.ok) throw new Error(JSON.parse(resText)?.error || `HTTP ${response.status}`);
       const data = JSON.parse(resText);
       setAvailableExercises(Array.isArray(data) ? data : []);
     } catch (err: unknown) {
         const message = err instanceof Error ? err.message : String(err);
         setErrorExercises(message || "Failed to load exercises");
         setAvailableExercises([]);
      } finally { setLoadingExercises(false); }
  }, [token]);

  useEffect(() => { fetchExercises(); }, [fetchExercises]);

  const handleExerciseSelect = (exerciseId: number, isSelected: boolean) => {
    const newSet = new Set(selectedExerciseIds);
    if (isSelected) { newSet.add(exerciseId); } else { newSet.delete(exerciseId); }
    setSelectedExerciseIds(newSet);
    setErrorSubmit(null);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!routineName.trim()) { setErrorSubmit("Routine name is required."); return; }
    if (selectedExerciseIds.size === 0) { setErrorSubmit("Please select at least one exercise."); return; }
    if (!token) { setErrorSubmit("Not authenticated."); return; }

    setLoadingSubmit(true); setErrorSubmit(null);

    const payload = { name: routineName.trim(), exerciseIds: Array.from(selectedExerciseIds) };

    try {
      const response = await fetch('/api/routines', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(payload),
      });
       const responseBody = await response.json();
       if (!response.ok) {
            const error: ErrorWithDetails = new Error(responseBody.error || `HTTP error ${response.status}`);
            if (responseBody.details && typeof responseBody.details === 'object') {
                error.details = responseBody.details as ErrorDetails;
            }
            throw error;
       }
      onRoutineSaved();
    } catch (err: unknown) {
        const error = err as ErrorWithDetails;
        const message = error.message || String(err);
        let detailsString = '';
        if (error.details) {
            try {
                detailsString = Object.entries(error.details)
                    .map(([field, messages]) => messages ? `${field}: ${messages.join(', ')}` : null)
                    .filter(Boolean) 
                    .join('; ');
                 if (detailsString) detailsString = ` Details: ${detailsString}`;
            } catch { /* Ignore */ }
        }
        setErrorSubmit(message + detailsString || "Failed to save routine.");
    } finally { setLoadingSubmit(false); }
  };

  return (
    <div>
      <h2>Create New Routine</h2>
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '1rem' }}>
          <label htmlFor="routine-name">Routine Name:</label>
          <input type="text" id="routine-name" value={routineName} onChange={(e) => setRoutineName(e.target.value)} required disabled={loadingSubmit} style={{ width: '100%', marginTop: '0.25rem' }} />
        </div>
        <div style={{ marginBottom: '1rem' }}>
          <h3>Select Exercises:</h3>
          {loadingExercises ? ( <div className="loading-container"><img src="/robofit25.png" alt="Loading..." width="40" height="40" style={{ animation: 'spin 1.5s linear infinite' }} /></div> )
           : errorExercises ? ( <p style={{ color: 'var(--accent-red)' }}>{errorExercises}</p> )
           : availableExercises.length > 0 ? (
            <div style={{ maxHeight: '300px', overflowY: 'auto', border: '1px solid var(--background-light)', padding: '10px', borderRadius: 'var(--border-radius)' }}>
              {availableExercises.map(ex => (
                <div key={ex.id} style={{ marginBottom: '5px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', padding: '5px' }}>
                    <input type="checkbox" checked={selectedExerciseIds.has(ex.id)} onChange={(e) => handleExerciseSelect(ex.id, e.target.checked)} disabled={loadingSubmit} style={{ marginRight: '10px', transform: 'scale(1.2)' }} />
                    {ex.name}
                  </label>
                </div>
              ))}
            </div>
          ) : ( <p>No exercises available to add.</p> )}
        </div>
        <div style={{ marginTop: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button type="submit" disabled={loadingSubmit || loadingExercises}> {loadingSubmit ? 'Saving...' : 'Save Routine'} </button>
          <button type="button" onClick={onRoutineSaved} disabled={loadingSubmit} style={{ backgroundColor: 'var(--background-light)', color: 'var(--text-secondary)' }}> Cancel </button>
        </div>
         <div style={{ minHeight: '1.5em', marginTop: '0.75rem' }}> {errorSubmit && <p style={{ color: 'var(--accent-red)', margin: 0 }}>Error: {errorSubmit}</p>} </div>
      </form>
    </div>
  );
};
export default RoutineEditView;