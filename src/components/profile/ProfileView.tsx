"use client";

import React, { useState, useEffect, Suspense, useCallback } from 'react';
// Dynamic import fyrir chart componentinn
const ProgressChart = React.lazy(() => import('@/components/charts/ProgressChart'));

interface SelectableExercise { id: number; name: string; }
interface ChartPoint { date: string; value: number; }
// Chart.js data
interface ChartJsData {
    labels: string[];
    datasets: {
        label: string; data: number[]; borderColor: string;
        backgroundColor: string; tension: number; fill: boolean;
    }[];
}

interface ProfileViewProps {
     token: string | null;
}

const ProfileView: React.FC<ProfileViewProps> = ({ token }) => {
    const [selectedExerciseId, setSelectedExerciseId] = useState<string>('');
    const [availableExercises, setAvailableExercises] = useState<SelectableExercise[]>([]);
    const [exerciseLoading, setExerciseLoading] = useState(true);
    const [exerciseError, setExerciseError] = useState<string | null>(null);
    const [chartData, setChartData] = useState<ChartJsData | null>(null);
    const [chartLoading, setChartLoading] = useState(false);
    const [chartError, setChartError] = useState<string | null>(null);

    const fetchExercisesForSelect = useCallback(async () => {
        if (!token) { setExerciseError("Not authenticated."); setExerciseLoading(false); return; }
        const isMounted = true;
        setExerciseLoading(true); setExerciseError(null);
        try {
            const response = await fetch('/api/exercises', { headers: { 'Authorization': `Bearer ${token}` } });
            const resText = await response.text();
            if (!response.ok) { throw new Error(JSON.parse(resText)?.error || `HTTP ${response.status}`); }
            const data = JSON.parse(resText);
            if (isMounted && Array.isArray(data)) { setAvailableExercises(data); }
            else if (isMounted) { setAvailableExercises([]); setExerciseError("Invalid data format."); }
        } catch (err) { // Nota unknown og type guard
            if (isMounted) {
                const message = err instanceof Error ? err.message : String(err);
                setExerciseError(message || "Failed to load exercises");
                setAvailableExercises([]);
            }
        } finally {
            if (isMounted) setExerciseLoading(false);
        }
    }, [token]); 

    useEffect(() => {
        fetchExercisesForSelect();
    }, [fetchExercisesForSelect]); 

    const fetchChartData = useCallback(async () => {
        if (!selectedExerciseId || !token) { setChartData(null); setChartLoading(false); setChartError(null); return; }
        const isMounted = true;
        setChartLoading(true); setChartError(null); setChartData(null);
        try {
            const response = await fetch(`/api/stats/progress?exerciseId=${selectedExerciseId}`, { headers: { 'Authorization': `Bearer ${token}` } });
            const resText = await response.text();
            if (!response.ok) { throw new Error(JSON.parse(resText)?.error || `API Error (${response.status})`); }
            const data: ChartPoint[] = JSON.parse(resText);
            if (isMounted && Array.isArray(data)) {
                if (data.length === 0) { setChartData(null); }
                else {
                    const exerciseName = availableExercises.find(ex => ex.id === parseInt(selectedExerciseId))?.name || 'Selected Exercise';
                    const formattedData: ChartJsData = {
                        labels: data.map((item) => new Date(item.date).toLocaleDateString('is-IS', { month:'short', day:'numeric'})),
                        datasets: [{
                            label: `${exerciseName} - Max Weight (kg)`, // Nákvæmara label
                            data: data.map((item) => typeof item.value === 'number' ? item.value : 0),
                            borderColor: 'var(--accent-red)',
                            backgroundColor: 'rgba(180, 50, 50, 0.2)',
                            tension: 0.1, fill: true,
                        }]
                    };
                    setChartData(formattedData);
                }
            } else if (isMounted) { setChartError("Unexpected data format."); }
        } catch (err) { 
            if (isMounted) {
                const message = err instanceof Error ? err.message : String(err);
                setChartError(message || "Failed to load chart data");
            }
        } finally {
            if (isMounted) setChartLoading(false);
        }
    }, [selectedExerciseId, token, availableExercises]); 

    useEffect(() => {
        fetchChartData();
    }, [fetchChartData]); 

    return (
        <div>
            
            <div style={{ marginBottom: '1rem' }}>
                <label htmlFor="profile-graph-exercise-select" style={{ marginRight: '10px' }}>Select Exercise:</label>
                {exerciseLoading ? ( <span>Loading exercises...</span> )
                : exerciseError ? ( <span style={{ color: 'var(--accent-red)' }}>{exerciseError}</span> )
                : (
                    <select
                        id="profile-graph-exercise-select" value={selectedExerciseId}
                        onChange={(e) => setSelectedExerciseId(e.target.value)}
                        style={{ minWidth: '200px'}}
                        disabled={!Array.isArray(availableExercises) || availableExercises.length === 0} >
                        <option value="" disabled> {!Array.isArray(availableExercises) ? "Error" : availableExercises.length === 0 ? "-- No Exercises --" : "-- Select --"} </option>
                        {Array.isArray(availableExercises) && availableExercises.map(ex => ( <option key={ex.id} value={ex.id}>{ex.name}</option> ))}
                    </select>
                )}
            </div>

            <div style={{ position: 'relative', height: '300px', backgroundColor: 'var(--background-light)', borderRadius: 'var(--border-radius)', padding: '10px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                 {chartLoading && <div className="loading-container absolute-center"><img src="/robofit25.png" alt="Loading..." width="40" height="40" style={{ animation: 'spin 1.5s linear infinite' }} /></div>}
                 {!chartLoading && chartError && <p style={{ color: 'var(--accent-red)', textAlign: 'center' }}>Error: {chartError}</p>}
                 {!chartLoading && !chartError && chartData && Array.isArray(chartData.datasets?.[0]?.data) && chartData.datasets[0].data.length > 0 && (
                     <Suspense fallback={<div className="loading-container absolute-center"><img src="/robofit25.png" alt="Loading..." width="40" height="40" style={{ animation: 'spin 1.5s linear infinite' }} /></div>}>
                         <div style={{width: '100%', height: '100%'}}> <ProgressChart chartData={chartData} /> </div>
                     </Suspense> )}
                 {!chartLoading && !chartError && (!chartData || !Array.isArray(chartData.datasets?.[0]?.data) || chartData.datasets[0].data.length === 0) && (
                     <div style={{ textAlign: 'center' }}>
                         <img src="/robofit25.png" alt="Select exercise or no data" width="80" height="80" style={{ animation: 'spin 3s linear infinite', opacity: 0.6 }} />
                         <p style={{ color: 'var(--text-secondary)', marginTop: '1rem' }}> {selectedExerciseId ? 'No workout data found.' : 'Select an exercise.'} </p>
                     </div> )}
            </div>
        </div>
    );
};
export default ProfileView; 