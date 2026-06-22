import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import '../styling/HomePage.css';

// --- HYBRID IMPORTS ---
import BacklogViewMock from './BacklogViewMock';
import SprintsViewMock from './SprintsViewMock';
import TeamView from './TeamView'; // <-- This is now the REAL component!

import NotificationBell from './NotificationBell';
import UserProfile from './UserProfile';

const HomePage = () => {
  const { projectId } = useParams();
  const navigate = useNavigate();

  const [projectName, setProjectName] = useState('Loading...');
  const [activeTab, setActiveTab] = useState('backlog'); 
  const [theme, setTheme] = useState(localStorage.getItem('sprintSightTheme') || 'system');

  const getCookie = (name) => {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
    return null;
  };

  useEffect(() => {
    if (!projectId) return;

    const fetchProjectDetails = async () => {
      try {
        const token = localStorage.getItem('sprintSightToken');
        const xsrfToken = getCookie('XSRF-TOKEN');

        const response = await fetch(`/api/projects/${projectId}`, {
          method: 'GET',
          headers: { 
            'Authorization': `Bearer ${token}`,
            'X-XSRF-TOKEN': xsrfToken,
            'Content-Type': 'application/json'
          }
        });
        
        if (response.ok) {
          const result = await response.json();
          const projectData = result.data || result; 
          setProjectName(projectData.name);
        } else {
          setProjectName('Project Not Found');
        }
      } catch (error) {
        console.error("Failed to load project sidebar:", error);
        setProjectName('Error Loading');
      }
    };

    fetchProjectDetails();
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

  const getBreadcrumbTitle = () => {
    if (activeTab === 'backlog') return 'Main Dashboard';
    if (activeTab === 'sprints') return 'Active Sprints';
    if (activeTab === 'team') return 'Team Management';
    return '';
  };

  return (
    <div className="homepage-wrapper">
      
      <aside className="sidebar">
        <div>
          <div className="sidebar-header">
             <h2 className="sidebar-project-name" title={projectName}>
               {projectName}
             </h2>
          </div>

          <nav className="sidebar-nav">
            <ul>
              <li><button className={`nav-item ${activeTab === 'backlog' ? 'active' : ''}`} onClick={() => setActiveTab('backlog')}><span className="icon">☰</span> Dashboard</button></li>
              <li><button className={`nav-item ${activeTab === 'sprints' ? 'active' : ''}`} onClick={() => setActiveTab('sprints')}><span className="icon">⚏</span> Active Sprints</button></li>
              <li className="nav-divider"></li>
              <li><button className="nav-item"><span className="icon"></span> Market Issues</button></li>
              <li><button className="nav-item"><span className="icon"></span> Assets Wiki</button></li>
              <li>
                <button className={`nav-item ${activeTab === 'team' ? 'active' : ''}`} onClick={() => setActiveTab('team')}>
                  <span className="icon"></span> Team
                </button>
              </li>
            </ul>
          </nav>
        </div>
        
        <div className="sidebar-footer">
          <button className="manage-btn" onClick={() => navigate('/dashboard')}>MANAGE PROJECTS</button>
        </div>
      </aside>

      <div className="main-panel">
        <header className="top-bar">
          <div className="top-bar-left">
             <span className="breadcrumb">
               Sprint Sight / <strong style={{color: 'var(--text-main)'}}>{getBreadcrumbTitle()}</strong>
             </span>
          </div>
          
          <div className="top-bar-actions" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
             <button className="icon-btn" onClick={cycleTheme} title={`Theme: ${theme}`}>
               {getThemeIcon()}
             </button>
               <NotificationBell/>
               <UserProfile />
          </div>
        </header>

        <main className="main-content">
          <div className="content-glow"></div> 
          <div key={activeTab} className="tab-content-wrapper">
            
            {/* The Hybrid Routing Strategy */}
            {activeTab === 'backlog' && <BacklogViewMock />}
            {activeTab === 'sprints' && <SprintsViewMock />}
            {activeTab === 'team' && <TeamView projectId={projectId} />}
            
          </div>
        </main>
      </div>
    </div>
  );
};

export default HomePage;