"use client";

import React from 'react';

type NavigationView = 'dashboard' | 'exercises' | 'routines' | 'log' | 'history';

type CurrentView = NavigationView | 'login' | 'register' | 'routineEdit' | string;

interface NavBarProps {
  onNavigate: (view: NavigationView) => void; 
  onLogout: () => void;
  currentView: CurrentView;
}

const NavBar: React.FC<NavBarProps> = ({ onNavigate, onLogout, currentView }) => {

  const buttonStyle: React.CSSProperties = {
      marginRight: '10px',
      backgroundColor: 'transparent',
      color: 'var(--text-secondary)',
      border: 'none',
      padding: '5px 10px',
      cursor: 'pointer',
      fontWeight: 'normal',
      transition: 'color 0.2s ease, font-weight 0.2s ease' 
  };
  const activeStyle: React.CSSProperties = {
      color: 'var(--accent-red)',
      fontWeight: 'bold',
  };
  const getStyle = (viewName: NavigationView): React.CSSProperties => {
     
      return { ...buttonStyle, ...(currentView === viewName ? activeStyle : {}) };
  };

  return (
    <nav className="card" style={{ padding: '5px 15px', marginBottom: 'var(--padding-base)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      
      <div>
        <button type="button" onClick={() => onNavigate('dashboard')} style={getStyle('dashboard')}> Dashboard </button>
        <button type="button" onClick={() => onNavigate('exercises')} style={getStyle('exercises')}> Exercises </button>
        <button type="button" onClick={() => onNavigate('routines')} style={getStyle('routines')}> Routines </button>
        <button type="button" onClick={() => onNavigate('log')} style={getStyle('log')}> Log Workout </button>
        <button type="button" onClick={() => onNavigate('history')} style={getStyle('history')}> History </button>
      </div>
      <div>
        <button
            type="button"
            onClick={onLogout}
            style={{backgroundColor: 'var(--background-light)', color: 'var(--text-secondary)'}}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--background-medium)'} 
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--background-light)'}
        >
             Logout
        </button>
      </div>
    </nav>
  );
};
export default NavBar;