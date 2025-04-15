"use client";

import React, { useState } from 'react';

interface AddExerciseFormProps {
  token: string | null;
  onExerciseAdded?: () => void;
}

interface CustomError extends Error {
  details?: unknown;
}

const AddExerciseForm: React.FC<AddExerciseFormProps> = ({ token, onExerciseAdded }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Exercise name is required.");
      return;
    }
    if (!token) {
      setError("Not authenticated.");
      return;
    }
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const response = await fetch('/api/exercises', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ name: name.trim(), description: description.trim() || null }),
      });
      const responseBody = await response.json();
      if (!response.ok)
        throw new Error(responseBody.error || `HTTP error ${response.status}`);

      setSuccess(`Exercise "${responseBody.name}" added!`);
      setName('');
      setDescription('');
      if (onExerciseAdded) onExerciseAdded();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: unknown) {
      console.error("Error adding exercise:", err);
      let errorMessage = "Failed to add exercise.";
      if (err instanceof Error) {
        errorMessage = err.message;
        const customErr = err as CustomError;
        if (customErr.details) {
          errorMessage += ` Details: ${JSON.stringify(customErr.details)}`;
        }
      }
      setError(errorMessage);
      setTimeout(() => setError(null), 5000);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ marginTop: '20px', paddingTop: '20px', borderTop: '1px solid var(--background-light)' }}>
      <h4>Add Custom Exercise</h4>
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '1rem' }}>
          <label htmlFor="ex-name">Exercise Name:</label>
          <input
            type="text"
            id="ex-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            disabled={loading}
            style={{ width: '100%', marginTop: '0.25rem' }}
          />
        </div>
        <div style={{ marginBottom: '1rem' }}>
          <label htmlFor="ex-desc">Description (Optional):</label>
          <input
            type="text"
            id="ex-desc"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={loading}
            style={{ width: '100%', marginTop: '0.25rem' }}
          />
        </div>
        <div style={{ marginTop: '1rem' }}>
          <button type="submit" disabled={loading}>
            {loading ? 'Adding...' : 'Add Exercise'}
          </button>
          <div style={{ minHeight: '1.5em', marginTop: '0.75rem' }}>
            {error && <p style={{ color: 'var(--accent-red)', margin: 0 }}>Error: {error}</p>}
            {success && <p style={{ color: 'lightgreen', margin: 0 }}>{success}</p>}
          </div>
        </div>
      </form>
    </div>
  );
};

export default AddExerciseForm;