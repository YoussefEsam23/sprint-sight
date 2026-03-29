import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import '../styling/HomePage.css';

import BacklogViewMock from './BacklogViewMock';
import SprintsViewMock from './SprintsViewMock';

const HomePageMock = () => {
  const { projectId } = useParams(); 
  const navigate = useNavigate();

  const [projectName, setProjectName] = useState('Loading...');
  const [activeTab, setActiveTab] = useState('backlog'); 
  
  const [theme, setTheme] = useState(localStorage.getItem('sprintSightTheme') || 'system');

  useEffect(() => {
    const savedProjects = localStorage.getItem('sprintSightMockProjects');
    if (savedProjects) {
      const projectsArray = JSON.parse(savedProjects);
      const currentProject = projectsArray.find(p => p.id == projectId);
      setProjectName(currentProject ? currentProject.name : `Project #${projectId.substring(0, 4)}`);
    }
  }, [projectId]);

  useEffect(() => {
    const applyTheme = (selectedTheme) => {
      if (selectedTheme === 'system') {
        const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        document.documentElement.setAttribute('data-theme', systemDark ? 'dark' : 'light');
      } else {
        document.documentElement.setAttribute('data-theme', selectedTheme);
      }
    };

    applyTheme(theme);
    localStorage.setItem('sprintSightTheme', theme);

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => { if (theme === 'system') applyTheme('system'); };
    mediaQuery.addEventListener('change', handleChange);
    
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [theme]);

  const cycleTheme = () => {
    if (theme === 'light') setTheme('dark');
    else if (theme === 'dark') setTheme('system');
    else setTheme('light');
  };

  const getThemeIcon = () => {
    if (theme === 'light') return '☀️';
    if (theme === 'dark') return '🌙';
    return '💻';
  };

  return (
    <div className="homepage-wrapper">
      
      {/* --- SIDEBAR --- */}
      <aside className="sidebar">
        <div>
          <div className="sidebar-header">
            <div className="sidebar-logo">{projectName.charAt(0).toUpperCase()}</div>
            <div className="sidebar-title">
              <h2>{projectName}</h2>
              <p>Design Studio</p>
            </div>
          </div>

          <nav className="sidebar-nav">
            <ul>
              <li><button className={`nav-item ${activeTab === 'backlog' ? 'active' : ''}`} onClick={() => setActiveTab('backlog')}><span className="icon">☰</span> Dashboard</button></li>
              <li><button className={`nav-item ${activeTab === 'sprints' ? 'active' : ''}`} onClick={() => setActiveTab('sprints')}><span className="icon">⚏</span> Active Sprints</button></li>
              <li className="nav-divider"></li>
              <li><button className="nav-item"><span className="icon">!</span> Market Issues</button></li>
              <li><button className="nav-item"><span className="icon">📖</span> Assets Wiki</button></li>
              <li><button className="nav-item"><span className="icon">⚙</span> Settings</button></li>
            </ul>
          </nav>
        </div>
        
        <div className="sidebar-footer">
          <button className="manage-btn" onClick={() => navigate('/dashboard')}>MANAGE PROJECTS</button>
        </div>
      </aside>

      {/* --- NEW: MAIN PANEL WRAPPER --- */}
      <div className="main-panel">
        
        {/* --- NEW: TOP APP BAR --- */}
        <header className="top-bar">
          <div className="top-bar-left">
             <span className="breadcrumb">
               Sprint Sight / <strong style={{color: 'var(--text-main)'}}>{activeTab === 'backlog' ? 'Main Dashboard' : 'Active Sprints'}</strong>
             </span>
          </div>
          
          <div className="top-bar-actions">
             {/* Icon-only buttons with no outlines */}
             <button className="icon-btn" onClick={cycleTheme} title={`Theme: ${theme}`}>
               {getThemeIcon()}
             </button>
             <button className="icon-btn" title="Notifications">
               🔔
             </button>
             <button className="icon-btn" title="Profile">
               👤
             </button>
          </div>
        </header>

        {/* --- SCROLLABLE CONTENT AREA --- */}
        <main className="main-content">
          <div className="content-glow"></div> 
          <div key={activeTab} className="tab-content-wrapper">
            {activeTab === 'backlog' && <BacklogViewMock />}
            {activeTab === 'sprints' && <SprintsViewMock />}
          </div>
        </main>

      </div>
    </div>
  );
};

export default HomePageMock;