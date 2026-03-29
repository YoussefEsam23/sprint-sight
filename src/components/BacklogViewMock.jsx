import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';

const getLocalStoriesDB = () => {
  const saved = localStorage.getItem('sprintSightMockStories');
  return saved ? JSON.parse(saved) : {};
};

const getLocalSprintsDB = () => {
  const saved = localStorage.getItem('sprintSightMockSprints');
  return saved ? JSON.parse(saved) : {};
};

const BacklogViewMock = () => {
  const { projectId } = useParams(); 
  const [stories, setStories] = useState([]);
  const [projectSprints, setProjectSprints] = useState([]); 
  const [selectedStory, setSelectedStory] = useState(null); 
  const [openMenuId, setOpenMenuId] = useState(null);
  const [editingStoryId, setEditingStoryId] = useState(null);
  
  const [isStoryModalOpen, setIsStoryModalOpen] = useState(false);
  const [storyFormData, setStoryFormData] = useState({ 
    title: '', description: '', status: 'To do', priority: 'Medium', sprintId: '' 
  });
  const [formErrors, setFormErrors] = useState({});

  useEffect(() => {
    const handleClickOutside = () => setOpenMenuId(null);
    document.addEventListener('click', handleClickOutside);
    setStories(getLocalStoriesDB()[projectId] || []);
    setProjectSprints(getLocalSprintsDB()[projectId] || []);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [projectId]);

  const saveStoriesToMemory = (updatedStories) => {
    setStories(updatedStories);
    const db = getLocalStoriesDB();
    db[projectId] = updatedStories; 
    localStorage.setItem('sprintSightMockStories', JSON.stringify(db));
  };

  const handleMenuClick = (e, id) => { e.stopPropagation(); setOpenMenuId(openMenuId === id ? null : id); };

  const openStoryModal = (story = null) => {
    if (story) {
      setEditingStoryId(story.id);
      setStoryFormData({ 
        title: story.title, description: story.description, 
        status: story.status, priority: story.priority, sprintId: story.sprintId || '' 
      });
    } else {
      setEditingStoryId(null);
      setStoryFormData({ title: '', status: 'To do', priority: 'Medium', sprintId: '' });
    }
    setFormErrors({}); setIsStoryModalOpen(true); setOpenMenuId(null);
  };

  const handleDeleteStory = (e, id) => {
    e.stopPropagation();
    if (window.confirm("Are you sure you want to delete this user story?")) { 
      saveStoriesToMemory(stories.filter(s => s.id !== id)); 
    }
    setOpenMenuId(null);
  };

  const handleSaveStory = (e) => {
    e.preventDefault();
    if (!storyFormData.title.trim()) { setFormErrors({title: "Title is required."}); return; }
    
    const assignedSprintId = storyFormData.sprintId ? Number(storyFormData.sprintId) : null;
    let updatedStories;
    
    if (editingStoryId) {
      updatedStories = stories.map(s => s.id === editingStoryId ? { ...s, ...storyFormData, sprintId: assignedSprintId } : s);
    } else {
      updatedStories = [...stories, { id: Math.floor(Math.random() * 900) + 100, ...storyFormData, sprintId: assignedSprintId, tasks: [] }];
    }
    
    saveStoriesToMemory(updatedStories); 
    setIsStoryModalOpen(false);
  };

  return (
    <>
      {!selectedStory && (
        <div className="content-left">
          <div className="page-header">
            <div>
              <p className="page-subtitle">BACKLOG OVERVIEW</p>
              <h1 className="page-title">Product Backlog</h1>
            </div>
            <div className="header-actions">
              <button className="new-story-btn" onClick={() => openStoryModal()}>+ NEW USER STORY</button>
            </div>
          </div>

          <div className="story-list">
            {stories.map(story => (
              <div key={story.id} className="story-card" style={{ position: 'relative', zIndex: openMenuId === story.id ? 50 : 1 }} onClick={() => setSelectedStory(story)}>
                <div className="story-id">#{story.id}</div>
                <div className="story-info">
                  <h3 className="story-title">{story.title}</h3>
                  <p className="story-desc">{story.description}</p>
                  <div style={{marginTop: '0.8rem', display: 'flex', gap: '1rem', fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: '600'}}>
                    <span>Status: <strong style={{color: 'var(--accent-color)'}}>{story.status}</strong></span>
                    <span>Priority: <strong>{story.priority}</strong></span>
                    {story.sprintId && <span style={{background: 'var(--bg-hover)', color: 'var(--accent-color)', padding: '2px 8px', borderRadius: '12px'}}>In Sprint</span>}
                  </div>
                </div>
                
                <div className="menu-container">
                  <button className="options-btn" onClick={(e) => handleMenuClick(e, story.id)}>⋮</button>
                  {openMenuId === story.id && (
                    <div className="dropdown-menu">
                      <button className="dropdown-item" onClick={(e) => { e.stopPropagation(); openStoryModal(story); }}>✏️ Edit Story</button>
                      <button className="dropdown-item" style={{color: '#e74c3c'}} onClick={(e) => handleDeleteStory(e, story.id)}>🗑️ Delete Story</button>
                    </div>
                  )}
                </div>
              </div>
            ))}
            
            {stories.length === 0 && (
              <div style={{ textAlign: 'center', padding: '4rem', background: 'var(--bg-card)', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                <h2 style={{ color: 'var(--text-main)', marginBottom: '0.5rem' }}>Your backlog is empty.</h2>
                <p style={{ color: 'var(--text-muted)' }}>Click '+ New User Story' to start planning your project.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {selectedStory && (
        <div className="content-left">
           <button style={{background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: '600'}} onClick={() => setSelectedStory(null)}>
             ← Back to Product Backlog
           </button>
           <h1 className="page-title">{selectedStory.title}</h1>
           <p style={{color: 'var(--text-muted)'}}>Tasks coming soon...</p>
        </div>
      )}

      {isStoryModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2 className="modal-title">{editingStoryId ? 'Edit User Story' : 'Create New User Story'}</h2>
            
            <form className="modal-form" onSubmit={handleSaveStory}>
              <div className="form-group">
                <label>Story Title</label>
                <input 
                  type="text" 
                  className="modal-input" 
                  placeholder="e.g., Integrate Payment Gateway"
                  value={storyFormData.title} 
                  onChange={(e) => setStoryFormData({...storyFormData, title: e.target.value})} 
                />
                {formErrors.title && <span style={{color: '#e74c3c', fontSize: '0.85rem', fontWeight: '600', marginTop: '4px'}}>{formErrors.title}</span>}
              </div>
              
              <div className="form-group">
                <label>Description</label>
                <textarea 
                  className="modal-input" 
                  placeholder="As a user, I want to..."
                  value={storyFormData.description} 
                  onChange={(e) => setStoryFormData({...storyFormData, description: e.target.value})} 
                />
              </div>
              
              <div className="form-row">
                <div className="form-group">
                  <label>Status</label>
                  <select 
                    className="modal-input select-input" 
                    value={storyFormData.status} 
                    onChange={(e) => setStoryFormData({...storyFormData, status: e.target.value})}
                  >
                    <option>To do</option>
                    <option>In Progress</option>
                    <option>Completed</option>
                  </select>
                </div>
                
                <div className="form-group">
                  <label>Priority</label>
                  <select 
                    className="modal-input select-input" 
                    value={storyFormData.priority} 
                    onChange={(e) => setStoryFormData({...storyFormData, priority: e.target.value})}
                  >
                    <option>Low</option>
                    <option>Medium</option>
                    <option>High</option>
                    <option>Critical</option>
                  </select>
                </div>
              </div>
              
              <div className="form-group">
                <label>Assign to Sprint</label>
                <select 
                  className="modal-input select-input" 
                  value={storyFormData.sprintId} 
                  onChange={(e) => setStoryFormData({...storyFormData, sprintId: e.target.value})}
                >
                  <option value="">Backlog (Unassigned)</option>
                  {projectSprints.map(sprint => (
                    <option key={sprint.id} value={sprint.id}>{sprint.name}</option>
                  ))}
                </select>
              </div>
              
              <div className="modal-actions">
                <button type="button" className="modal-btn cancel-btn" onClick={() => setIsStoryModalOpen(false)}>Cancel</button>
                <button type="submit" className="modal-btn save-btn">{editingStoryId ? 'Save Changes' : 'Create Story'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default BacklogViewMock;