import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import '../styling/ProjectDashboard.css';

// --- IMPORT LOGOS ---
import logoLight from '/sprint-sight-logo.png';
import logoDark from '/sprint-sight-logo-dark.png';

//components
import NotificationBell from './NotificationBell';
import UserProfile from './UserProfile';

const projectSchema = z.object({
  name: z.string().min(3, "Project name must be at least 3 characters"),
  description: z.string().min(10, "Please provide a short description (min 10 characters)")
});

// Helper to get CSRF token
const getCookie = (name) => {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop().split(';').shift();
  return null;
};

const ProjectDashboard = () => {
  // --- REAL API PROJECT STATES ---
  const [projects, setProjects] = useState([]);
  const [isProjectsLoading, setIsProjectsLoading] = useState(true);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [openMenuId, setOpenMenuId] = useState(null); 
  const [editingProjectId, setEditingProjectId] = useState(null);
  
  // --- SEARCH & SORT STATES ---
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOption, setSortOption] = useState('newest'); 
  const [isSortDropdownOpen, setIsSortDropdownOpen] = useState(false);
  
  // --- THEME ENGINE STATE ---
  const [theme, setTheme] = useState(localStorage.getItem('sprintSightTheme') || 'system');
  
  // --- PROFILE & SETTINGS STATES ---
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [profileMessage, setProfileMessage] = useState('');

  const storedUser = JSON.parse(localStorage.getItem('sprintSightUser')) || {};
  const currentUserId = storedUser.id || storedUser._id;
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

  const isDark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  const logoSrc = isDark ? logoDark : logoLight;

  const { register, handleSubmit, formState: { errors }, reset } = useForm({
    resolver: zodResolver(projectSchema)
  });

  const fetchAllProjects = async () => {
      setIsProjectsLoading(true);
      try {
        const token = localStorage.getItem('sprintSightToken');
        const headers = {
          'Authorization': `Bearer ${token}`,
          'X-XSRF-TOKEN': getCookie('XSRF-TOKEN')
        };

        // 1. Fire BOTH requests simultaneously
        const [ownedResponse, memberResponse] = await Promise.all([
          fetch('api/projects/owned', { method: 'GET', credentials: 'include', headers }),
          fetch('api/projects/member', { method: 'GET', credentials: 'include', headers })
        ]);
        
        let combinedProjects = [];

        // 2. Parse Owned Projects
        if (ownedResponse.ok) {
          const ownedJson = await ownedResponse.json();
          const owned = ownedJson.data || ownedJson || [];
          combinedProjects = [...combinedProjects, ...owned];
        } else {
          console.error("Failed to fetch owned projects. Status:", ownedResponse.status);
        }

        // 3. Parse Member Projects
        if (memberResponse.ok) {
          const memberJson = await memberResponse.json();
          const member = memberJson.data || memberJson || [];
          combinedProjects = [...combinedProjects, ...member];
        } else {
          console.error("Failed to fetch member projects. Status:", memberResponse.status);
        }

        // 4. Deduplicate (Just in case the backend returns a project in both lists)
        const uniqueProjects = Array.from(
          new Map(combinedProjects.map(project => [project.id || project._id, project])).values()
        );

        setProjects(uniqueProjects); 

      } catch (error) {
        console.error("Network error fetching projects:", error);
      } finally {
        setIsProjectsLoading(false);
      }
    };

    useEffect(() => {
    fetchAllProjects();
  }, []);

  // --- CLICK OUTSIDE HANDLER ---
  useEffect(() => {
    const handleClickOutside = () => {
      setOpenMenuId(null);
      setIsProfileDropdownOpen(false); 
      setIsSortDropdownOpen(false);    
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
    const id = project.id || project._id;
    setEditingProjectId(id);
    reset({ name: project.name, description: project.description });
    setOpenMenuId(null); 
    setIsModalOpen(true); 
  };

  // --- DELETE PROJECT API ---
  const handleDeleteClick = async (e, id) => {
    e.stopPropagation();
    if (!window.confirm("Are you sure you want to delete this project?")) return;
    
    setOpenMenuId(null);
    try {
      const token = localStorage.getItem('sprintSightToken');
      const response = await fetch(`api/projects/${id}`, {
        method: 'DELETE',
        credentials: 'include',
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-XSRF-TOKEN': getCookie('XSRF-TOKEN')
        }
      });

      if (response.ok) {
        setProjects(projects.filter(p => (p.id || p._id) !== id));
      } else {
        alert("Failed to delete project. Please try again.");
      }
    } catch (error) {
      console.error("Error deleting project:", error);
    }
  };

  const openNewProjectModal = () => {
    setEditingProjectId(null); 
    reset({ name: '', description: '' }); 
    setIsModalOpen(true);
  };

  const closeModal = () => { setIsModalOpen(false); reset(); };

  // --- CREATE / UPDATE PROJECT API ---
  const onSubmit = async (data) => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('sprintSightToken');
      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'X-XSRF-TOKEN': getCookie('XSRF-TOKEN')
      };

      if (editingProjectId) {
        // --- EDIT PROJECT (PUT) ---
        const response = await fetch(`api/projects/${editingProjectId}`, {
          method: 'PUT',
          credentials: 'include',
          headers,
          body: JSON.stringify(data)
        });

        if (response.ok) {
          const rawResponse = await response.json();
          const updatedProject = rawResponse.data || rawResponse.project || rawResponse;
          
          setProjects(prevProjects => prevProjects.map(p => 
            (p.id || p._id) === editingProjectId ? updatedProject : p
          ));
          
          setIsModalOpen(false);
          reset(); 
        } else {
          alert("Failed to update project");
        }
      } else {
        // --- CREATE PROJECT (POST) ---
        const response = await fetch(`api/projects`, {
          method: 'POST',
          credentials: 'include',
          headers,
          body: JSON.stringify(data)
        });

        if (response.ok) {
          const rawResponse = await response.json();
          const newProject = rawResponse.data || rawResponse.project || rawResponse;
          
          setProjects(prevProjects => [...prevProjects, newProject]);
          
          setIsModalOpen(false);
          reset(); 
        } else {
          alert("Failed to create project");
        }
      }
    } catch (error) {
      console.error("Error saving project:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // --- ACCOUNT & PROFILE HANDLERS ---
  const handleLogout = async () => {
    try {
      const token = localStorage.getItem('sprintSightToken');
      
      await fetch(`api/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'X-XSRF-TOKEN': getCookie('XSRF-TOKEN')
        }
      });

      await fetch('api/auth/logout', {
        method: 'POST',
        credentials: 'include', 
        headers: { 
          'Authorization': `Bearer ${token}`,
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

      await fetch(`api/auth/refresh`, {
        method: 'POST',
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
        delete updatedUser.password; 
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

      await fetch(`api/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'X-XSRF-TOKEN': getCookie('XSRF-TOKEN')
        }
      });
        
      const response = await fetch(`api/users/${userId}`, {
        method: 'DELETE',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'credentials': 'include',
          'X-XSRF-TOKEN': getCookie('XSRF-TOKEN')
        }
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

// --- BULLETPROOF FILTER & SORT LOGIC ---
  const safeProjects = Array.isArray(projects) ? projects : [];

  const filteredAndSortedProjects = safeProjects
    .map((project, index) => ({ ...project, _originalIndex: index }))
    .filter(project => {
      const projectName = project.name || '';
      const projectDesc = project.description || '';
      const query = (searchQuery || '').toLowerCase();
      
      return projectName.toLowerCase().includes(query) || 
             projectDesc.toLowerCase().includes(query);
    })
    .sort((a, b) => {
      if (sortOption === 'newest') return b._originalIndex - a._originalIndex; 
      if (sortOption === 'oldest') return a._originalIndex - b._originalIndex;

      const nameA = (a.name || '').toLowerCase();
      const nameB = (b.name || '').toLowerCase();
      
      if (sortOption === 'name-asc') return nameA.localeCompare(nameB);
      if (sortOption === 'name-desc') return nameB.localeCompare(nameA);
      
      return 0;
    });

  return (
    <div className="dashboard-wrapper">
      <header className="header">
        <div className="header-left">
          <img 
              src={logoSrc} 
              alt="Sprint Sight Logo" 
              className="header-logo"
            />
          <h1 className="app-title brand-title">Sprint Sight</h1>
        </div>
        <div className="header-center">
          <div className="search-bar-container">
            <span className="search-icon">🔍</span>
            <input 
              type="search" 
              placeholder="Search project..." 
              className="search-input" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
        
        <div className="header-right">
          
          <button className="icon-btn" onClick={cycleTheme} title={`Theme: ${theme}`}>
            {getThemeIcon()}
          </button>
          
            <NotificationBell onInviteAccepted={fetchAllProjects} />
             <UserProfile /> 
          
           {/* <div 
            className="user-profile-icon" 
            onClick={(e) => { e.stopPropagation(); setIsProfileDropdownOpen(!isProfileDropdownOpen); setIsSortDropdownOpen(false); }}
            title="Account Menu"
          >
            <span className="user-initial">{currentUser.username.charAt(0).toUpperCase()}</span>
          </div> */}

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
          
          <div className="sort-container"> 
            <button 
              className="sort-btn" 
              onClick={(e) => { e.stopPropagation(); setIsSortDropdownOpen(!isSortDropdownOpen); setIsProfileDropdownOpen(false); }}
            >
              Sort {sortOption === 'newest' ? '(Newest)' : sortOption === 'oldest' ? '(Oldest)' : sortOption === 'name-asc' ? '(A-Z)' : '(Z-A)'} <span>▼</span>
            </button>
            
            {isSortDropdownOpen && (
              <div className="dropdown-menu sort-menu">
                <button className="dropdown-item" onClick={() => { setSortOption('newest'); setIsSortDropdownOpen(false); }}>Newest First</button>
                <button className="dropdown-item" onClick={() => { setSortOption('oldest'); setIsSortDropdownOpen(false); }}>Oldest First</button>
                <button className="dropdown-item" onClick={() => { setSortOption('name-asc'); setIsSortDropdownOpen(false); }}>Name (A-Z)</button>
                <button className="dropdown-item" onClick={() => { setSortOption('name-desc'); setIsSortDropdownOpen(false); }}>Name (Z-A)</button>
              </div>
            )}
          </div>
        </div>

        <div className="project-list">
          {isProjectsLoading ? (
             <div className="empty-state">
               <h2>Loading projects...</h2>
             </div>
          ) : (
            <>
              {filteredAndSortedProjects.map((project) => {
                const projectId = project.id || project._id; 
                
                // --- ROLE CALCULATION ---
                const isCreator = project.createdBy?.id === currentUserId;
                
                return (
                  <div key={projectId} className="project-card" style={{ zIndex: openMenuId === projectId ? 50 : 1 }} onClick={() => handleProjectClick(projectId)}>
                    
                    <div className="project-icon">
                       📁
                    </div>
                      
                    <div className="project-info">
                      <h3 className="project-name">{project.name}</h3>
                      <p className="project-desc">{project.description}</p>
                    </div>

                    <div className="project-meta project-meta-spaced" style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                      
                      <span style={{
                        fontSize: '0.75rem',
                        fontWeight: '700',
                        padding: '6px 14px',
                        borderRadius: '20px',
                        backgroundColor: isCreator ? 'rgba(245, 158, 11, 0.15)' : 'var(--bg-hover)',
                        color: isCreator ? 'var(--accent-color)' : 'var(--text-muted)',
                        border: isCreator ? '1px solid rgba(245, 158, 11, 0.3)' : '1px solid var(--border-color)',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px'
                      }}>
                        {isCreator ? 'Creator' : 'Member'}
                      </span>

                      {/* --- ROLE BASED ACCESS CONTROL FOR EDITING --- */}
                      {(() => {
                        // Check if backend sent their role. If not, fallback to whether they created it.
                        const projectRole = project.role || project.projectRole || project.userRole || '';
                        const canEditProject = isCreator || projectRole === 'SCRUM_MASTER' || projectRole === 'PRODUCT_OWNER';

                        // If they can't edit and aren't the creator, don't even show the ⋮ button!
                        if (!canEditProject && !isCreator) return null;

                        return (
                          <div className="menu-container">
                            <button className="options-btn" onClick={(e) => handleMenuClick(e, projectId)}>⋮</button>
                            {openMenuId === projectId && (
                              <div className="dropdown-menu">
                                {canEditProject && (
                                  <button className="dropdown-item" onClick={(e) => handleEditClick(e, project)}>Edit Project</button>
                                )}
                                
                                {isCreator && (
                                   <button className="dropdown-item delete-item" onClick={(e) => handleDeleteClick(e, projectId)}>Delete Project</button>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })()}
                      
                    </div>
                    
                  </div>
                );
              })}

              {filteredAndSortedProjects.length === 0 && !isProjectsLoading && projects.length > 0 && (
                <div className="empty-state">
                  <h2>No projects found</h2>
                  <p>Try adjusting your search criteria.</p>
                </div>
              )}

              {projects.length === 0 && !isProjectsLoading && (
                <div className="empty-state">
                  <h2>No projects yet</h2>
                  <p>Click '+ NEW PROJECT' to get started.</p>
                </div>
              )}
            </>
          )}
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
          <div className="modal-content profile-modal">
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
                <p className="profile-message-text">
                  {profileMessage}
                </p>
              )}

              <div className="modal-actions profile-actions">
                <button type="button" className="modal-btn cancel-btn delete-account-btn" onClick={handleDeleteAccount}>
                  Delete Account
                </button>
                <div className="modal-btn-group">
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