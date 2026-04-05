import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import '../styling/ProjectDashboard.css';

// --- NEW: IMPORT LOGOS ---
import logoLight from '/sprint-sight-logo.png';
import logoDark from '/sprint-sight-logo-dark.png';

const projectSchema = z.object({
  name: z.string().min(3, "Project name must be at least 3 characters"),
  description: z.string().min(10, "Please provide a short description (min 10 characters)"),
  isPrivate: z.boolean()
});

const initialProjects = [
  { id: 1, name: 'Project 1', description: 'Brand ecosystem and design system development for the 2024 launch.', status: 'ACTIVE', deadline: 'Oct 24', isPrivate: false },
  { id: 2, name: 'Cyanide Sprint', description: 'High-speed prototyping phase for the decentralized asset marketplace.', status: 'ON HOLD', deadline: 'Nov 12', isPrivate: true },
  { id: 3, name: 'Digital Transformation', description: 'Migrating legacy internal tools to the new unified Atelier cloud infrastructure.', status: 'ACTIVE', deadline: 'Dec 01', isPrivate: false }
];

const getCookie = (name) => {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop().split(';').shift();
  return null;
};

const ProjectDashboard = () => {
  const [projects, setProjects] = useState(() => {
    const savedProjects = localStorage.getItem('sprintSightMockProjects');
    return savedProjects ? JSON.parse(savedProjects) : initialProjects;
  });

  useEffect(() => {
    localStorage.setItem('sprintSightMockProjects', JSON.stringify(projects));
  }, [projects]); 

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [openMenuId, setOpenMenuId] = useState(null); 
  const [editingProjectId, setEditingProjectId] = useState(null);
  
  // --- THEME ENGINE STATE ---
  const [theme, setTheme] = useState(localStorage.getItem('sprintSightTheme') || 'system');
  
  // --- PROFILE & SETTINGS STATES ---
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [profileMessage, setProfileMessage] = useState('');

  // Get current user info from local storage (or fallback to placeholders)
  const storedUser = JSON.parse(localStorage.getItem('sprintSightUser')) || {};
  const [currentUser, setCurrentUser] = useState({
    username: storedUser.username || 'User',
    fullName: storedUser.fullName || 'My Account',
    email: storedUser.email || 'user@sprintsight.com'
  });

  const [profileFormData, setProfileFormData] = useState({ 
    fullName: currentUser.fullName, 
    username: currentUser.username, 
    email: currentUser.email, 
    password: '' 
  });

  const navigate = useNavigate();

  // --- NEW: LOGO SELECTION LOGIC ---
  const isDark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  const logoSrc = isDark ? logoDark : logoLight;

  const { register, handleSubmit, formState: { errors }, reset } = useForm({
    resolver: zodResolver(projectSchema),
    defaultValues: { isPrivate: false }
  });

  useEffect(() => {
    const handleClickOutside = () => {
      setOpenMenuId(null);
      setIsProfileDropdownOpen(false); // Close dropdown when clicking outside
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  // --- THEME EFFECT ---
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

  // --- THEME CYCLING LOGIC ---
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

  const handleProjectClick = (projectId) => navigate(`/project/${projectId}`);
  const handleMenuClick = (e, id) => { e.stopPropagation(); setOpenMenuId(openMenuId === id ? null : id); };

  const handleEditClick = (e, project) => {
    e.stopPropagation();
    setEditingProjectId(project.id);
    reset({ name: project.name, description: project.description, isPrivate: project.isPrivate });
    setOpenMenuId(null); 
    setIsModalOpen(true); 
  };

  const handleDeleteClick = (e, id) => {
    e.stopPropagation();
    if (window.confirm("Are you sure you want to delete this project?")) {
      setProjects(projects.filter(p => p.id !== id));
    }
    setOpenMenuId(null);
  };

  const openNewProjectModal = () => {
    setEditingProjectId(null); 
    reset({ name: '', description: '', isPrivate: false }); 
    setIsModalOpen(true);
  };

  const closeModal = () => { setIsModalOpen(false); reset(); };

  // --- ACCOUNT & PROFILE HANDLERS ---
  const handleLogout = async () => {
    try {
      const token = localStorage.getItem('sprintSightToken');
      // Replace this URL with your real backend logout endpoint if needed
      
        // refresh jwt token
        const refresh = await fetch(`api/auth/refresh` , {
          method : 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
            'X-XSRF-TOKEN': getCookie('XSRF-TOKEN')
          }
        });

      await fetch('api/auth/logout', {
        method: 'POST',
        credentials: 'include', 
        headers: { 'Authorization': `Bearer ${token}`,
        'X-XSRF-TOKEN': getCookie('XSRF-TOKEN')
       }
      });
    } catch (err) {
      console.error("Logout API failed, forcing local logout.");
    } finally {
      localStorage.removeItem('sprintSightToken');
      localStorage.removeItem('sprintSightUser');
      navigate('/');
    }
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setProfileMessage('');
    
    try {
      const token = localStorage.getItem('sprintSightToken');
      const rawUserData = JSON.parse(localStorage.getItem('sprintSightUser')) || {};
      const userId = rawUserData.id || rawUserData._id;

      // refresh jwt token
        const refresh = await fetch(`api/auth/refresh` , {
          method : 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
            'X-XSRF-TOKEN': getCookie('XSRF-TOKEN')
          }
        });

      const response = await fetch(`api/users/${userId}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'X-XSRF-TOKEN': getCookie('XSRF-TOKEN') 
        },
        body: JSON.stringify(profileFormData)
      });

      if (response.ok) {
        setProfileMessage('Profile updated successfully!');
        const updatedUser = { ...currentUser, ...profileFormData };
        delete updatedUser.password; // Keep passwords out of local storage!
        localStorage.setItem('sprintSightUser', JSON.stringify(updatedUser));
        setCurrentUser(updatedUser);
      } else {
        setProfileMessage('Failed to update profile.');
      }
    } catch (error) {
      setProfileMessage('Network error while updating.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!window.confirm("WARNING: Are you absolutely sure you want to delete your account? This cannot be undone.")) return;
    
    try {
      const token = localStorage.getItem('sprintSightToken');
      const rawUserData = JSON.parse(localStorage.getItem('sprintSightUser')) || {};
      const userId = rawUserData.id || rawUserData._id;

      if (!userId) {
        alert("Error: Could not find User ID. Please log out and log back in to refresh your data.");
        return;
      }

      // refresh jwt token
        const refresh = await fetch(`api/auth/refresh` , {
          method : 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
            'X-XSRF-TOKEN': getCookie('XSRF-TOKEN')
          }
        });
        
      const response = await fetch(`api/users/${userId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}`,
      credentials: 'include',
      'X-XSRF-TOKEN': getCookie('XSRF-TOKEN')}
      });

      if (response.ok) {
        localStorage.removeItem('sprintSightToken');
        localStorage.removeItem('sprintSightUser');
        navigate('/');
      } else {
        alert("Failed to delete account.");
      }
    } catch (error) {
      console.error("Network error deleting account:", error);
    }
  };

  const onSubmit = async (data) => {
    setIsLoading(true);
    try {
      if (editingProjectId) {
        setProjects(projects.map(p => 
          p.id === editingProjectId ? { ...p, name: data.name, description: data.description, isPrivate: data.isPrivate } : p
        ));
      } else {
        const newProject = { id: Date.now(), name: data.name, description: data.description, status: 'ACTIVE', deadline: 'TBD', isPrivate: data.isPrivate };
        setProjects([newProject, ...projects]);
      }
      setIsModalOpen(false);
      reset(); 
    } catch (error) {
      console.error("Error saving project:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="dashboard-wrapper">
      <header className="header">
        <div className="header-left">
          <img 
              src={logoSrc} 
              alt="Sprint Sight Logo" 
              style={{ height: '32px', width: 'auto', marginRight: '10px' }} 
            />
          <h1 className="app-title" style={{color: 'var(--accent-color)'}}>Sprint Sight</h1>
        </div>
        <div className="header-center">
          <div className="search-bar-container">
            <span className="search-icon">🔍</span>
            <input type="search" placeholder="Search project..." className="search-input" />
          </div>
        </div>
        
        <div className="header-right" style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', position: 'relative' }}>
          
          {/* --- THEME TOGGLE BUTTON --- */}
          <button className="icon-btn" onClick={cycleTheme} title={`Theme: ${theme}`}>
            {getThemeIcon()}
          </button>
          
          {/* Notification Emoji */}
          <button className="icon-btn" title="Notifications">
            🔔
          </button>
          
          {/* USER PROFILE ICON & DROPDOWN TRIGGER */}
          <div 
            className="user-profile-icon" 
            onClick={(e) => { e.stopPropagation(); setIsProfileDropdownOpen(!isProfileDropdownOpen); }}
            title="Account Menu"
          >
            <span className="user-initial">{currentUser.username.charAt(0).toUpperCase()}</span>
          </div>

          {/* THE PROFILE DROPDOWN MENU */}
          {isProfileDropdownOpen && (
            <div className="profile-dropdown" onClick={(e) => e.stopPropagation()}>
              <div className="profile-dropdown-header">
                <div className="profile-dropdown-avatar">
                  {currentUser.username.charAt(0).toUpperCase()}
                </div>
                <div className="profile-dropdown-info">
                  <h4>{currentUser.fullName}</h4>
                  <p>{currentUser.email}</p>
                </div>
              </div>
              
              <div className="profile-dropdown-actions">
                <button onClick={() => { setIsProfileDropdownOpen(false); setIsProfileModalOpen(true); }}>
                  <span>⚙️</span> Account Settings
                </button>
                <button className="logout-item" onClick={handleLogout}>
                  <span>🚪</span> Logout
                </button>
              </div>
            </div>
          )}

        </div>
      </header>

      <main className="dashboard-main">
        <div className="dashboard-header-section">
          <div>
            <h1 className="dashboard-title">Projects Dashboard</h1>
            <p className="dashboard-subtitle">
              Curating {projects.length} active creative workflows.
            </p>
          </div>
          <button className="new-project-btn" onClick={openNewProjectModal}>
            + NEW PROJECT
          </button>
        </div>

        <div className="workspace-header">
          <span className="workspace-label">LIVE WORKSPACE</span>
          <button className="sort-btn">Sort <span>▼</span></button>
        </div>

        <div className="project-list">
          {projects.map((project) => (
            <div key={project.id} className="project-card" style={{ position: 'relative', zIndex: openMenuId === project.id ? 50 : 1 }} onClick={() => handleProjectClick(project.id)}>
              <div className="project-icon">
                 {project.isPrivate ? '🔒' : '📁'}
              </div>
              
              <div className="project-info">
                <h3 className="project-name">{project.name}</h3>
                <p className="project-desc">{project.description}</p>
              </div>

              <div className="project-meta">
                <span className={`status-badge ${project.status === 'ACTIVE' ? 'active' : 'on-hold'}`}>
                  {project.status}
                </span>
                
                <div className="team-avatars">
                  <div className="avatar"></div>
                  <div className="avatar"></div>
                </div>

                <div className="deadline-info">
                  <span className="deadline-label">DEADLINE</span>
                  <span className="deadline-date">{project.deadline}</span>
                </div>
                
                <div className="menu-container">
                  <button className="options-btn" onClick={(e) => handleMenuClick(e, project.id)}>⋮</button>
                  {openMenuId === project.id && (
                    <div className="dropdown-menu">
                      <button className="dropdown-item" onClick={(e) => handleEditClick(e, project)}>✏️ Edit Project</button>
                      <button className="dropdown-item delete-item" onClick={(e) => handleDeleteClick(e, project.id)}>🗑️ Delete Project</button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>

      {/* --- CREATE / EDIT PROJECT MODAL --- */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2 className="modal-title">{editingProjectId ? 'Edit Project' : 'Create New Project'}</h2>
            
            <form className="modal-form" onSubmit={handleSubmit(onSubmit)}>
              <div className="form-group">
                <label>Project Name</label>
                <input type="text" placeholder="e.g., Website Redesign" className={`modal-input ${errors.name ? 'input-error' : ''}`} {...register("name")} />
                {errors.name && <span className="error-text">{errors.name.message}</span>}
              </div>

              <div className="form-group">
                <label>Description</label>
                <textarea rows="3" placeholder="Briefly describe the goal of this project..." className={`modal-input ${errors.description ? 'input-error' : ''}`} {...register("description")} />
                {errors.description && <span className="error-text">{errors.description.message}</span>}
              </div>

              <div className="form-group checkbox-group">
                <label className="checkbox-label">
                  <input type="checkbox" className="custom-checkbox" {...register("isPrivate")} />
                  <div className="checkbox-text">
                    <strong>Make this project Private</strong>
                    <p>Only you and invited members can see this project.</p>
                  </div>
                </label>
              </div>

              <div className="modal-actions">
                <button type="button" className="modal-btn cancel-btn" onClick={closeModal} disabled={isLoading}>Cancel</button>
                <button type="submit" className="modal-btn save-btn" disabled={isLoading}>
                  {isLoading ? 'Saving...' : (editingProjectId ? 'Save Changes' : 'Create Project')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- ACCOUNT SETTINGS / UPDATE USER MODAL --- */}
      {isProfileModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '450px' }}>
            <h2 className="modal-title">Account Settings</h2>
            
            <form className="modal-form" onSubmit={handleUpdateProfile}>
              
              <div className="form-group">
                <label>Full Name</label>
                <input 
                  type="text" 
                  className="modal-input" 
                  value={profileFormData.fullName}
                  onChange={(e) => setProfileFormData({...profileFormData, fullName: e.target.value})}
                />
              </div>

              <div className="form-group">
                <label>Email Address</label>
                <input 
                  type="email" 
                  className="modal-input" 
                  value={profileFormData.email}
                  onChange={(e) => setProfileFormData({...profileFormData, email: e.target.value})}
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Username</label>
                  <input 
                    type="text" 
                    className="modal-input" 
                    value={profileFormData.username}
                    onChange={(e) => setProfileFormData({...profileFormData, username: e.target.value})}
                  />
                </div>

                <div className="form-group">
                  <label>New Password</label>
                  <input 
                    type="password" 
                    placeholder="Leave blank to keep" 
                    className="modal-input" 
                    value={profileFormData.password}
                    onChange={(e) => setProfileFormData({...profileFormData, password: e.target.value})}
                  />
                </div>
              </div>

              {profileMessage && (
                <p style={{ color: 'var(--accent-color)', fontWeight: 'bold', fontSize: '0.85rem', textAlign: 'center' }}>
                  {profileMessage}
                </p>
              )}

              <div className="modal-actions" style={{ justifyContent: 'space-between', marginTop: '1.5rem' }}>
                <button type="button" className="modal-btn cancel-btn" style={{ color: '#e74c3c', padding: '0' }} onClick={handleDeleteAccount}>
                  Delete Account
                </button>
                <div style={{ display: 'flex', gap: '1rem' }}>
                  <button type="button" className="modal-btn cancel-btn" onClick={() => setIsProfileModalOpen(false)}>Cancel</button>
                  <button type="submit" className="modal-btn save-btn" disabled={isLoading}>
                    {isLoading ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default ProjectDashboard;