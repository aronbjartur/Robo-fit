"use client";

import React, { useState, useEffect, useCallback } from 'react';

interface SelectableExercise {
  id: number;
  name: string;
}
interface WorkoutLogFormProps {
  token: string | null;
  initialExerciseId?: number | null;
}
interface ErrorWithDetails extends Error {
  details?: { [key: string]: string[] | undefined } | undefined;
}


const WorkoutLogForm: React.FC<WorkoutLogFormProps> = ({ token, initialExerciseId }) => {
  const getTodayString = () => new Date().toISOString().split('T')[0];

  const [selectedExerciseId, setSelectedExerciseId] = useState<string>('');
  const [date, setDate] = useState<string>(getTodayString());
  const [sets, setSets] = useState<string>('');
  const [reps, setReps] = useState<string>('');
  const [weight, setWeight] = useState<string>('');
  const [availableExercises, setAvailableExercises] = useState<SelectableExercise[]>([]);
  const [exerciseLoading, setExerciseLoading] = useState(true);
  const [exerciseError, setExerciseError] = useState<string | null>(null);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);

  const fetchExercisesForSelect = useCallback(async () => {
    if (!token) { setExerciseError("Not authenticated."); setExerciseLoading(false); return; }
    setExerciseLoading(true);
    setExerciseError(null);
    try {
      const response = await fetch('/api/exercises', { headers: { 'Authorization': `Bearer ${token}` } });
      const resText = await response.text();
      if (!response.ok) throw new Error(JSON.parse(resText)?.error || `HTTP ${response.status}`);
      const data = JSON.parse(resText);
      setAvailableExercises(Array.isArray(data) ? data : []);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      setExerciseError(message || "Failed to load exercises");
      setAvailableExercises([]);
    } finally {
      setExerciseLoading(false);
    }
  }, [token]);

  useEffect(() => { fetchExercisesForSelect(); }, [fetchExercisesForSelect]);

  useEffect(() => {
    if (initialExerciseId && availableExercises.length > 0) {
      const exists = availableExercises.some(ex => ex.id === initialExerciseId);
      if (exists) setSelectedExerciseId(String(initialExerciseId));
    }
  }, [initialExerciseId, availableExercises]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitError(null); setSubmitSuccess(null);

    if (!selectedExerciseId) return setSubmitError("Please select an exercise.");
    if (!sets || !reps || !weight) return setSubmitError("Please fill in Sets, Reps, and Weight.");
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const selectedDate = new Date(date); selectedDate.setHours(0, 0, 0, 0);
    if (selectedDate > today) return setSubmitError("Cannot log future date.");
    const parsedSets = parseInt(sets, 10);
    const parsedReps = parseInt(reps, 10);
    const parsedWeight = parseFloat(weight);
    if (isNaN(parsedSets) || isNaN(parsedReps) || isNaN(parsedWeight) || parsedSets <= 0 || parsedReps <= 0 || parsedWeight < 0) {
        setSubmitError("Please enter valid positive Sets/Reps & non-negative Weight.");
        return;
    }
    if (!token) { setSubmitError("Authentication error."); return; }

    setSubmitLoading(true);

    const logData = {
        exerciseId: parseInt(selectedExerciseId, 10),
        date: new Date(date).toISOString(),
        sets: parsedSets, reps: parsedReps, weight: parsedWeight,
    };

    try {
       const response = await fetch('/api/workouts', {
           method: 'POST',
           headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
           body: JSON.stringify(logData),
       });
       const responseBody = await response.json();
       if (!response.ok) {
            const error: ErrorWithDetails = new Error(responseBody.error || `HTTP error ${response.status}`);
             if (responseBody.details && typeof responseBody.details === 'object') {
                  error.details = responseBody.details as { [key: string]: string[] | undefined };
             }
            throw error;
       }

       setSubmitSuccess(`Workout logged successfully! (Log ID: ${responseBody.id})`);
       setSelectedExerciseId(''); setSets(''); setReps(''); setWeight('');
       setTimeout(() => setSubmitSuccess(null), 3000);

    } catch (err: unknown) {
        const error = err as ErrorWithDetails; 
        const message = error.message || String(err);
        let detailsString = ''; 
        if (error.details) {
            try {
                detailsString = Object.entries(error.details)
                    .map(([field, messages]) => messages ? `${field}: ${messages.join(', ')}` : null)
                    .filter(Boolean).join('; ');
                 if (detailsString) detailsString = ` Details: ${detailsString}`;
            } catch { /* Ignore formatting error */ }
        }
        setSubmitError(message + detailsString || "An unknown error occurred.");
        setTimeout(() => setSubmitError(null), 5000);
    } finally {
        setSubmitLoading(false);
    }
  };

  return (
    <div>
      <h3>Log a Workout</h3>
      {exerciseLoading && ( <div className="loading-container" style={{ minHeight: '100px' }}><img src="/robofit25.png" alt="Loading..." width="40" height="40" style={{ animation: 'spin 1.5s linear infinite' }}/></div> )}
      {exerciseError && !exerciseLoading && ( <p style={{ color: 'var(--accent-red)' }}>Error: {exerciseError}</p> )}
      {!exerciseLoading && !exerciseError && (
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '1rem' }}>
            <label htmlFor="exercise-select">Exercise:</label>
            <select id="exercise-select" value={selectedExerciseId} onChange={(e) => { setSelectedExerciseId(e.target.value); setSubmitSuccess(null); setSubmitError(null); }} required disabled={submitLoading || availableExercises.length === 0} style={{ width: '100%', marginTop: '0.25rem' }}>
              <option value="" disabled>{availableExercises.length === 0 ? '-- No Exercises --' : '-- Select --'}</option>
              {availableExercises.map(ex => ( <option key={ex.id} value={ex.id}>{ex.name}</option> ))}
            </select>
          </div>
          <div style={{ marginBottom: '1rem' }}>
            <label htmlFor="log-date">Date:</label>
            <input type="date" id="log-date" value={date} onChange={(e) => setDate(e.target.value)} required disabled={submitLoading} max={getTodayString()} style={{ width: '100%', marginTop: '0.25rem' }} />
          </div>
          <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
            <div style={{ flexGrow: 1 }}> <label htmlFor="log-sets">Sets:</label> <input type="number" id="log-sets" value={sets} onChange={(e) => setSets(e.target.value)} min="1" required disabled={submitLoading} style={{ width: '100%', marginTop: '0.25rem' }} /> </div>
            <div style={{ flexGrow: 1 }}> <label htmlFor="log-reps">Reps:</label> <input type="number" id="log-reps" value={reps} onChange={(e) => setReps(e.target.value)} min="1" required disabled={submitLoading} style={{ width: '100%', marginTop: '0.25rem' }} /> </div>
            <div style={{ flexGrow: 1 }}> <label htmlFor="log-weight">Weight (kg):</label> <input type="number" id="log-weight" value={weight} onChange={(e) => setWeight(e.target.value)} min="0" step="0.25" required disabled={submitLoading} style={{ width: '100%', marginTop: '0.25rem' }} /> </div>
          </div>
          <div style={{ marginTop: '1.5rem' }}>
              <button type="submit" disabled={submitLoading || !selectedExerciseId || exerciseLoading}> {submitLoading ? 'Saving Log...' : 'Save Workout Log'} </button>
              <div style={{ minHeight: '1.5em', marginTop: '0.75rem' }}> {submitError && <p style={{ color: 'var(--accent-red)', margin: 0 }}>Error: {submitError}</p>} {submitSuccess && <p style={{ color: 'lightgreen', margin: 0 }}>{submitSuccess}</p>} </div>
          </div>
        </form>
      )}
    </div>
  );
};
export default WorkoutLogForm;