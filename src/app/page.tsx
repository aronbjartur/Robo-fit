"use client";

import React, { useState, useEffect, useCallback } from 'react';


import Login from '@/components/auth/Login';
import Register from '@/components/auth/Register';
import NavBar from '@/components/navigation/NavBar';
import DashboardView from '@/components/dashboard/DashboardView';
import ExerciseList from '@/components/exercises/ExerciseList';
import AddExerciseForm from '@/components/exercises/AddExerciseForm';
import RoutineList from '@/components/routines/RoutineList';
import WorkoutLogForm from '@/components/workouts/WorkoutLogForm';
import WorkoutHistory from '@/components/workouts/WorkoutHistory';
import RoutineEditView from '@/components/routines/RoutineEditView';


const NavBarFallback = () => <div className="card">Nav Placeholder</div>;
const DashboardViewFallback = () => <div className="card">Dashboard Placeholder</div>;
const ExerciseListFallback = () => <div className="card">Exercise List Placeholder</div>;
const AddExerciseFormFallback = () => <div className="card">Add Exercise Placeholder</div>;
const RoutineListFallback = () => <div className="card">Routine List Placeholder</div>;
const WorkoutLogFormFallback = () => <div className="card">Log Form Placeholder</div>;
const WorkoutHistoryFallback = () => <div className="card">History Placeholder</div>;
const RoutineEditViewFallback = () => <div className="card">Routine Edit Placeholder</div>;


type CurrentView = 'login' | 'register' | 'dashboard' | 'exercises' | 'log' | 'routines' | 'history' | 'routineEdit';
interface UserData { id: number; username: string; email: string; admin?: boolean; }
interface AuthData { token: string; user: UserData; }


export default function HomePage() {
  const [authData, setAuthData] = useState<AuthData | null>(null);
  const [currentView, setCurrentView] = useState<CurrentView>('login');
  const [isLoading, setIsLoading] = useState(true);
  const [registrationMessage, setRegistrationMessage] = useState<string | null>(null);
  const [exerciseToLog, setExerciseToLog] = useState<number | null>(null);
  const [exerciseListVersion, setExerciseListVersion] = useState(0); // Notað til að triggera refetch
  const [routineListVersion, setRoutineListVersion] = useState(0); // Notað til að triggera refetch

  useEffect(() => {
    setIsLoading(true);
    const token = localStorage.getItem('token');
    const userString = localStorage.getItem('user');
    if (token && userString) {
      try {
        const user: UserData = JSON.parse(userString);
        setAuthData({ token, user });
        setCurrentView('dashboard');
      } catch (e) {
        console.error("Auth Error parsing user from localStorage:", e);
        localStorage.removeItem('token'); localStorage.removeItem('user');
        setAuthData(null); setCurrentView('login');
      }
    } else {
      setAuthData(null); setCurrentView('login');
    }
    setIsLoading(false);
  }, []);

  const handleLogin = (data: AuthData) => {
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
    setAuthData(data);
    setCurrentView('dashboard');
    setRegistrationMessage(null);
  };

  const handleLogout = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setAuthData(null);
    setCurrentView('login');
  }, []);

  const handleRegistrationSuccess = () => {
    setRegistrationMessage("Nýskráning tókst! Þú getur nú skráð þig inn.");
    setCurrentView('login');
  };

  const navigateTo = useCallback((view: CurrentView) => {
    if (authData) {
      setExerciseToLog(null); // Hreinsa alltaf forval
      setCurrentView(view);
    } else {
      handleLogout(); // Logga út ef reynt er að navigeita án þess að vera innloggaður
    }
  }, [authData, handleLogout]);

  const handleLogExerciseClick = useCallback((exerciseId: number) => {
    setExerciseToLog(exerciseId);
    setCurrentView('log');
  }, []);

  // Callbacks til að endurhlaða lista
  const forceExerciseRefetch = useCallback(() => setExerciseListVersion(v => v + 1), []);
  const forceRoutineRefetch = useCallback(() => setRoutineListVersion(v => v + 1), []);

  // Callback frá RoutineEditView
  const handleRoutineSavedOrCancelled = useCallback(() => {
     forceRoutineRefetch(); // Uppfæra lista
     navigateTo('routines'); // Fara til baka á rútínulista
   }, [forceRoutineRefetch, navigateTo]);


  
  const renderCurrentView = () => {
    // Velja componenta með fallbacks ef import klikkar
    const ResolvedDashboardView = typeof DashboardView === 'function' ? DashboardView : DashboardViewFallback;
    const ResolvedExerciseList = typeof ExerciseList === 'function' ? ExerciseList : ExerciseListFallback;
    const ResolvedAddExerciseForm = typeof AddExerciseForm === 'function' ? AddExerciseForm : AddExerciseFormFallback;
    const ResolvedRoutineList = typeof RoutineList === 'function' ? RoutineList : RoutineListFallback;
    const ResolvedWorkoutLogForm = typeof WorkoutLogForm === 'function' ? WorkoutLogForm : WorkoutLogFormFallback;
    const ResolvedWorkoutHistory = typeof WorkoutHistory === 'function' ? WorkoutHistory : WorkoutHistoryFallback;
    const ResolvedRoutineEditView = typeof RoutineEditView === 'function' ? RoutineEditView : RoutineEditViewFallback;

    // Ef ekki innskráður
    if (!authData) {
      if (currentView === 'register') {
        return <div className="card"><Register onRegistrationSuccess={handleRegistrationSuccess} /></div>;
      }
      // Annars sjálfgefið að sýna Login
      return (
        <div className="card">
          {registrationMessage && <p style={{ color: 'lightgreen', marginBottom: '1rem' }}>{registrationMessage}</p>}
          <Login onLogin={handleLogin} />
        </div>
      );
    }

    // Ef innskráður en authData er ógilt (ætti ekki að gerast)
    if (!authData.token || !authData.user) {
        handleLogout();
        return <div className="card"><p>Authentication error. Logging out...</p></div>;
    }

    // Innskráður notandi - birta réttan skjá
    switch (currentView) {
      case 'dashboard':
        return <div className="card"><ResolvedDashboardView user={authData.user} token={authData.token} onLogout={handleLogout} /></div>;
      case 'exercises':
        return (
          <div className="card">
            <h2>Exercises</h2>
            <ResolvedAddExerciseForm token={authData.token} onExerciseAdded={forceExerciseRefetch} />
            <ResolvedExerciseList
               key={`ex-list-${exerciseListVersion}`} // Lykill fyrir endurhleðslu
               token={authData.token}
               onLogExercise={handleLogExerciseClick}
               onExerciseDeleted={forceExerciseRefetch}
               loggedInUserId={authData.user.id}
             />
          </div>
        );
       case 'routines':
         return (
            <div className="card">
               <h2>Routines</h2>
               <ResolvedRoutineList
                   key={`routine-list-${routineListVersion}`} // Lykill fyrir endurhleðslu
                   token={authData.token}
                   onCreateRoutine={() => navigateTo('routineEdit')}
                   onRoutineDeleted={forceRoutineRefetch}
                   loggedInUserId={authData.user.id}
               />
            </div>
         );
       case 'routineEdit':
          return (
             <div className="card">
                 <ResolvedRoutineEditView
                     token={authData.token}
                     onRoutineSaved={handleRoutineSavedOrCancelled}
                 />
             </div>
          );
       case 'log':
         return (
             <div className="card">
                <ResolvedWorkoutLogForm
                    token={authData.token}
                    initialExerciseId={exerciseToLog}
                />
             </div>
         );
       case 'history':
         return (
            <div className="card">
                <ResolvedWorkoutHistory
                    token={authData.token}
                />
            </div>
         );
      default:
        // Ekki logga warning hér, bara vísa á dashboard
        navigateTo('dashboard');
        return null; // Sýna ekkert á meðan view breytist
    }
  }; 


  const ResolvedNavBar = typeof NavBar === 'function' ? NavBar : NavBarFallback;


  return (
    // Nota flexbox til að stýra footer betur
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <main style={{ maxWidth: '800px', margin: '0 auto', padding: 'var(--padding-base)', width: '100%', flexGrow: 1 }}>
        <h1 style={{ textAlign: 'center', marginBottom: 'var(--padding-base)', color: 'var(--accent-red)'}}>RoboFit</h1>

        {isLoading ? (
          // Loading state
          <div className="loading-container" style={{ flexGrow: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
             <img src="/robofit25.png" alt="Loading..." width="50" height="50" style={{ animation: 'spin 1.5s linear infinite' }} />
          </div>
        ) : (
           // Ekki loading
           <>
              {authData && <ResolvedNavBar
                onNavigate={navigateTo}
                onLogout={handleLogout}
                currentView={currentView} 
             />}

              <div style={{ marginTop: authData ? 'var(--padding-base)' : '0' }}>
                 {renderCurrentView()}
              </div>

              {!authData && (
                 <div style={{ marginTop: "20px", textAlign: 'center' }}>
                    <button onClick={() => { setRegistrationMessage(null); setCurrentView(currentView === 'login' ? 'register' : 'login'); }}>
                       {currentView === 'login' ? "Vantar þér aðgangur? Nýskráning" : "Ertu með aðgang? Innskráning"}
                    </button>
                 </div>
              )}
           </>
        )}
      </main>
     
      {!isLoading && (
            <footer style={{ backgroundColor: 'var(--background-medium)', padding: '15px 0', textAlign: 'center', marginTop: 'auto' }}>
                <img src="/robofit25.png" alt="RoboFit Logo" width="35" height="35" style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: '10px' }} />
               
                <span style={{color: 'var(--text-secondary)', fontSize: '0.8em', verticalAlign: 'middle'}}>
                    © {new Date().getFullYear()} RoboFit - Öll réttindi áskilin.
                </span>
            </footer>
      )}
      
    </div> 
  );

}