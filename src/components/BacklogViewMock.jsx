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

// --- NEW: TASK DATABASE ---
const getLocalTasksDB = () => {
  const saved = localStorage.getItem('sprintSightMockTasks');
  return saved ? JSON.parse(saved) : {};
};

const BacklogViewMock = () => {
  const { projectId } = useParams(); 
  const [stories, setStories] = useState([]);
  const [projectSprints, setProjectSprints] = useState([]); 
  const [tasks, setTasks] = useState([]); // Task state
  
  const [selectedStory, setSelectedStory] = useState(null); 
  const [openMenuId, setOpenMenuId] = useState(null);
  
  // Story States
  const [editingStoryId, setEditingStoryId] = useState(null);
  const [isStoryModalOpen, setIsStoryModalOpen] = useState(false);
  const [storyFormData, setStoryFormData] = useState({ 
    title: '', description: '', status: 'To do', priority: 'Medium', sprintId: '' 
  });
  const [formErrors, setFormErrors] = useState({});

  // Task States
  const [editingTaskId, setEditingTaskId] = useState(null);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [taskFormData, setTaskFormData] = useState({
    title: '', description: '', status: 'To do', priority: 'Medium', assignedTo: 'Unassigned'
  });

  useEffect(() => {
    const handleClickOutside = () => setOpenMenuId(null);
    document.addEventListener('click', handleClickOutside);
    setStories(getLocalStoriesDB()[projectId] || []);
    setProjectSprints(getLocalSprintsDB()[projectId] || []);
    setTasks(getLocalTasksDB()[projectId] || []); // Load Tasks
    return () => document.removeEventListener('click', handleClickOutside);
  }, [projectId]);

  const saveStoriesToMemory = (updatedStories) => {
    setStories(updatedStories);
    const db = getLocalStoriesDB();
    db[projectId] = updatedStories; 
    localStorage.setItem('sprintSightMockStories', JSON.stringify(db));
  };

  const saveTasksToMemory = (updatedTasks) => {
    setTasks(updatedTasks);
    const db = getLocalTasksDB();
    db[projectId] = updatedTasks; 
    localStorage.setItem('sprintSightMockTasks', JSON.stringify(db));
  };

  const handleMenuClick = (e, id) => { e.stopPropagation(); setOpenMenuId(openMenuId === id ? null : id); };

  // --- STORY HANDLERS ---
  const openStoryModal = (story = null) => {
    if (story) {
      setEditingStoryId(story.id);
      setStoryFormData({ 
        title: story.title, description: story.description, 
        status: story.status, priority: story.priority, sprintId: story.sprintId || '' 
      });
    } else {
      setEditingStoryId(null);
      setStoryFormData({ title: '', description: '', status: 'To do', priority: 'Medium', sprintId: '' });
    }
    setFormErrors({}); setIsStoryModalOpen(true); setOpenMenuId(null);
  };

  const handleDeleteStory = (e, id) => {
    e.stopPropagation();
    if (window.confirm("Are you sure you want to delete this user story?")) { 
      saveStoriesToMemory(stories.filter(s => s.id !== id)); 
      // Also delete related tasks
      saveTasksToMemory(tasks.filter(t => t.userStoryId !== id));
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
      updatedStories = [...stories, { id: Math.floor(Math.random() * 900) + 100, ...storyFormData, sprintId: assignedSprintId }];
    }
    
    saveStoriesToMemory(updatedStories); 
    setIsStoryModalOpen(false);
  };

  // --- TASK HANDLERS ---
  const openTaskModal = (task = null) => {
    if (task) {
      setEditingTaskId(task.id);
      setTaskFormData({ 
        title: task.title, description: task.description, 
        status: task.status, priority: task.priority, assignedTo: task.assignedTo || 'Unassigned' 
      });
    } else {
      setEditingTaskId(null);
      setTaskFormData({ title: '', description: '', status: 'To do', priority: 'Medium', assignedTo: 'Unassigned' });
    }
    setFormErrors({}); setIsTaskModalOpen(true); setOpenMenuId(null);
  };

  const handleDeleteTask = (e, id) => {
    e.stopPropagation();
    if (window.confirm("Are you sure you want to delete this task?")) { 
      saveTasksToMemory(tasks.filter(t => t.id !== id)); 
    }
    setOpenMenuId(null);
  };

  const handleSaveTask = (e) => {
    e.preventDefault();
    if (!taskFormData.title.trim()) { setFormErrors({title: "Title is required."}); return; }
    
    // Get the logged in user to set "Created By"
    const currentUser = JSON.parse(localStorage.getItem('sprintSightUser')) || {};
    const creatorName = currentUser.fullName || currentUser.username || 'System Admin';

    let updatedTasks;
    if (editingTaskId) {
      updatedTasks = tasks.map(t => t.id === editingTaskId ? { ...t, ...taskFormData } : t);
    } else {
      updatedTasks = [...tasks, { 
        id: Math.floor(Math.random() * 90000) + 10000, // System generated ID
        userStoryId: selectedStory.id, // Links task to current story
        createdBy: creatorName,
        ...taskFormData 
      }];
    }
    
    saveTasksToMemory(updatedTasks); 
    setIsTaskModalOpen(false);
  };

  // Filter tasks that belong to the currently selected story
  const storyTasks = selectedStory ? tasks.filter(t => t.userStoryId === selectedStory.id) : [];

  return (
    <>
      {/* --- BACKLOG LIST VIEW --- */}
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
            {stories.map(story => {
              const storyTaskCount = tasks.filter(t => t.userStoryId === story.id).length;
              return (
                <div key={story.id} className="story-card" style={{ position: 'relative', zIndex: openMenuId === story.id ? 50 : 1, cursor: 'pointer' }} onClick={() => setSelectedStory(story)}>
                  <div className="story-id">#{story.id}</div>
                  <div className="story-info">
                    <h3 className="story-title">{story.title}</h3>
                    <p className="story-desc">{story.description}</p>
                    <div style={{marginTop: '0.8rem', display: 'flex', gap: '1rem', fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: '600', flexWrap: 'wrap'}}>
                      <span>Status: <strong style={{color: 'var(--accent-color)'}}>{story.status}</strong></span>
                      <span>Priority: <strong>{story.priority}</strong></span>
                      <span style={{background: 'var(--bg-hover)', color: 'var(--text-main)', padding: '2px 8px', borderRadius: '12px'}}>
                         {storyTaskCount} Tasks
                      </span>
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
              );
            })}
            
            {stories.length === 0 && (
              <div style={{ textAlign: 'center', padding: '4rem', background: 'var(--bg-card)', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                <h2 style={{ color: 'var(--text-main)', marginBottom: '0.5rem' }}>Your backlog is empty.</h2>
                <p style={{ color: 'var(--text-muted)' }}>Click '+ New User Story' to start planning your project.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* --- TASK LIST VIEW (Inside a User Story) --- */}
      {selectedStory && (
        <div className="content-left">
           <button style={{background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: '600'}} onClick={() => setSelectedStory(null)}>
             ← Back to Product Backlog
           </button>
           
           <div className="page-header" style={{ marginBottom: '2rem' }}>
            <div>
              <p className="page-subtitle">USER STORY #{selectedStory.id}</p>
              <h1 className="page-title">{selectedStory.title}</h1>
              <p style={{color: 'var(--text-muted)', marginTop: '0.5rem'}}>{selectedStory.description}</p>
            </div>
            <div className="header-actions">
              <button className="new-story-btn" onClick={() => openTaskModal()}>+ CREATE TASK</button>
            </div>
          </div>

          <div className="story-list">
            {storyTasks.map(task => (
              <div key={task.id} className="story-card" style={{ position: 'relative', zIndex: openMenuId === task.id ? 50 : 1 }}>
                <div className="story-id">#{task.id}</div>
                <div className="story-info">
                  <h3 className="story-title">{task.title}</h3>
                  <p className="story-desc">{task.description}</p>
                  
                  <div style={{marginTop: '0.8rem', display: 'flex', gap: '1rem', fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: '600', flexWrap: 'wrap'}}>
                    <span style={{background: 'var(--bg-hover)', padding: '2px 8px', borderRadius: '12px', color: 'var(--text-main)'}}>
                      👤 {task.assignedTo}
                    </span>
                    <span>Status: <strong style={{color: 'var(--accent-color)'}}>{task.status}</strong></span>
                    <span>Priority: <strong>{task.priority}</strong></span>
                  </div>
                  
                  <div style={{marginTop: '0.5rem', fontSize: '0.75rem', color: 'var(--text-muted)'}}>
                    Created by: {task.createdBy}
                  </div>
                </div>
                
                <div className="menu-container">
                  <button className="options-btn" onClick={(e) => handleMenuClick(e, task.id)}>⋮</button>
                  {openMenuId === task.id && (
                    <div className="dropdown-menu">
                      <button className="dropdown-item" onClick={(e) => { e.stopPropagation(); openTaskModal(task); }}>✏️ Edit Task</button>
                      <button className="dropdown-item" style={{color: '#e74c3c'}} onClick={(e) => handleDeleteTask(e, task.id)}>🗑️ Delete Task</button>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {storyTasks.length === 0 && (
              <div style={{ textAlign: 'center', padding: '4rem', background: 'var(--bg-card)', borderRadius: '12px', border: '1px dashed var(--border-color)' }}>
                <h2 style={{ color: 'var(--text-main)', marginBottom: '0.5rem' }}>No tasks assigned to this story yet.</h2>
                <p style={{ color: 'var(--text-muted)' }}>Click '+ Create Task' to break this story down into actionable steps.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* --- CREATE/EDIT STORY MODAL --- */}
      {isStoryModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2 className="modal-title">{editingStoryId ? 'Edit User Story' : 'Create New User Story'}</h2>
            <form className="modal-form" onSubmit={handleSaveStory}>
              <div className="form-group">
                <label>Story Title</label>
                <input type="text" className="modal-input" placeholder="e.g., Integrate Payment Gateway" value={storyFormData.title} onChange={(e) => setStoryFormData({...storyFormData, title: e.target.value})} />
                {formErrors.title && <span style={{color: '#e74c3c', fontSize: '0.85rem', fontWeight: '600', marginTop: '4px'}}>{formErrors.title}</span>}
              </div>
              <div className="form-group">
                <label>Description</label>
                <textarea className="modal-input" placeholder="As a user, I want to..." value={storyFormData.description} onChange={(e) => setStoryFormData({...storyFormData, description: e.target.value})} />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Status</label>
                  <select className="modal-input" value={storyFormData.status} onChange={(e) => setStoryFormData({...storyFormData, status: e.target.value})}>
                    <option>To do</option><option>In Progress</option><option>Completed</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Priority</label>
                  <select className="modal-input" value={storyFormData.priority} onChange={(e) => setStoryFormData({...storyFormData, priority: e.target.value})}>
                    <option>Low</option><option>Medium</option><option>High</option><option>Critical</option>
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label>Assign to Sprint</label>
                <select className="modal-input" value={storyFormData.sprintId} onChange={(e) => setStoryFormData({...storyFormData, sprintId: e.target.value})}>
                  <option value="">Backlog (Unassigned)</option>
                  {projectSprints.map(sprint => (<option key={sprint.id} value={sprint.id}>{sprint.name}</option>))}
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

      {/* --- NEW: CREATE/EDIT TASK MODAL --- */}
      {isTaskModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ zIndex: 9999 }}>
            <h2 className="modal-title">{editingTaskId ? 'Edit Task' : 'Create New Task'}</h2>
            <form className="modal-form" onSubmit={handleSaveTask}>
              <div className="form-group">
                <label>Task Title</label>
                <input type="text" className="modal-input" placeholder="e.g., Setup Database Schema" value={taskFormData.title} onChange={(e) => setTaskFormData({...taskFormData, title: e.target.value})} />
                {formErrors.title && <span style={{color: '#e74c3c', fontSize: '0.85rem', fontWeight: '600', marginTop: '4px'}}>{formErrors.title}</span>}
              </div>
              
              <div className="form-group">
                <label>Description</label>
                <textarea className="modal-input" placeholder="Technical details for this task..." value={taskFormData.description} onChange={(e) => setTaskFormData({...taskFormData, description: e.target.value})} />
              </div>
              
              <div className="form-row">
                <div className="form-group">
                  <label>Status</label>
                  <select className="modal-input" value={taskFormData.status} onChange={(e) => setTaskFormData({...taskFormData, status: e.target.value})}>
                    <option>To do</option><option>In Progress</option><option>Review</option><option>Done</option>
                  </select>
                </div>
                
                <div className="form-group">
                  <label>Priority</label>
                  <select className="modal-input" value={taskFormData.priority} onChange={(e) => setTaskFormData({...taskFormData, priority: e.target.value})}>
                    <option>Low</option><option>Medium</option><option>High</option><option>Critical</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label>Assign To</label>
                <select className="modal-input" value={taskFormData.assignedTo} onChange={(e) => setTaskFormData({...taskFormData, assignedTo: e.target.value})}>
                  <option value="Unassigned">Unassigned</option>
                  <option value="Front-end Developer">Front-end Developer</option>
                  <option value="Back-end Developer">Back-end Developer</option>
                  <option value="UI/UX Designer">UI/UX Designer</option>
                </select>
              </div>

              <div className="modal-actions">
                <button type="button" className="modal-btn cancel-btn" onClick={() => setIsTaskModalOpen(false)}>Cancel</button>
                <button type="submit" className="modal-btn save-btn">{editingTaskId ? 'Save Changes' : 'Create Task'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default BacklogViewMock;