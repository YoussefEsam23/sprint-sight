import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import '../styling/SprintsView.css'; // <-- NEW IMPORT

const getLocalSprintsDB = () => {
  const saved = localStorage.getItem('sprintSightMockSprints');
  return saved ? JSON.parse(saved) : {};
};
const getLocalStoriesDB = () => {
  const saved = localStorage.getItem('sprintSightMockStories');
  return saved ? JSON.parse(saved) : {};
};

const SprintsViewMock = () => {
  const { projectId } = useParams(); 
  const [sprints, setSprints] = useState([]);
  const [allStories, setAllStories] = useState([]); 
  const [openMenuId, setOpenMenuId] = useState(null);
  const [editingSprintId, setEditingSprintId] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({ name: '', startDate: '', endDate: '' });
  
  const [isAddStoryModalOpen, setIsAddStoryModalOpen] = useState(false);
  const [targetSprintId, setTargetSprintId] = useState(null);
  const [selectedStoryIds, setSelectedStoryIds] = useState([]);

  useEffect(() => {
    const handleClickOutside = () => setOpenMenuId(null);
    document.addEventListener('click', handleClickOutside);
    setSprints(getLocalSprintsDB()[projectId] || []);
    setAllStories(getLocalStoriesDB()[projectId] || []);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [projectId]);

  const saveSprintsToMemory = (updatedSprints) => {
    setSprints(updatedSprints);
    const db = getLocalSprintsDB();
    db[projectId] = updatedSprints;
    localStorage.setItem('sprintSightMockSprints', JSON.stringify(db));
  };

  const openModal = (sprint = null) => {
    if (sprint) { setEditingSprintId(sprint.id); setFormData({ name: sprint.name, startDate: sprint.startDate, endDate: sprint.endDate }); } 
    else { setEditingSprintId(null); setFormData({ name: '', startDate: '', endDate: '' }); }
    setIsModalOpen(true); setOpenMenuId(null);
  };

  const handleDeleteSprint = (id) => {
    if (window.confirm("Delete this Sprint?")) {
      saveSprintsToMemory(sprints.filter(s => s.id !== id));
      const storyDb = getLocalStoriesDB();
      const projectStories = storyDb[projectId] || [];
      const updatedStories = projectStories.map(story => story.sprintId === id ? { ...story, sprintId: null } : story);
      storyDb[projectId] = updatedStories;
      localStorage.setItem('sprintSightMockStories', JSON.stringify(storyDb));
      setAllStories(updatedStories); 
    }
  };

  const handleSaveSprint = (e) => {
    e.preventDefault();
    let updatedSprints;
    if (editingSprintId) updatedSprints = sprints.map(s => s.id === editingSprintId ? { ...s, ...formData } : s);
    else updatedSprints = [...sprints, { id: Math.floor(Math.random() * 9000) + 1000, ...formData }];
    saveSprintsToMemory(updatedSprints); setIsModalOpen(false);
  };

  const openAddStoryModal = (sprintId) => { setTargetSprintId(sprintId); setSelectedStoryIds([]); setIsAddStoryModalOpen(true); };
  const toggleStorySelection = (storyId) => setSelectedStoryIds(prev => prev.includes(storyId) ? prev.filter(id => id !== storyId) : [...prev, storyId]);

  const handleSaveAssignedStories = (e) => {
    e.preventDefault();
    const storyDb = getLocalStoriesDB();
    const updatedStories = (storyDb[projectId] || []).map(story => selectedStoryIds.includes(story.id) ? { ...story, sprintId: targetSprintId } : story);
    storyDb[projectId] = updatedStories;
    localStorage.setItem('sprintSightMockStories', JSON.stringify(storyDb));
    setAllStories(updatedStories); setIsAddStoryModalOpen(false);
  };

  const handleRemoveStoryFromSprint = (storyId) => {
    if (window.confirm("Remove from sprint?")) {
      const storyDb = getLocalStoriesDB();
      const updatedStories = (storyDb[projectId] || []).map(story => story.id === storyId ? { ...story, sprintId: null } : story);
      storyDb[projectId] = updatedStories;
      localStorage.setItem('sprintSightMockStories', JSON.stringify(storyDb));
      setAllStories(updatedStories); 
    }
  };

  const unassignedStories = allStories.filter(story => !story.sprintId);

  return (
    <>
      <div className="content-left">
        <div className="page-header">
          <div>
            <p className="page-subtitle">SPRINTS OVERVIEW</p>
            <h1 className="page-title">Active Sprints</h1>
          </div>
          <div className="header-actions">
            <button className="new-story-btn" onClick={() => openModal()}>+ CREATE SPRINT</button>
          </div>
        </div>

        <div className="sv-container">
          {sprints.map(sprint => {
            const sprintStories = allStories.filter(story => story.sprintId === sprint.id);
            return (
              // zIndex remains inline because it is a dynamic JS value
              <div key={sprint.id} className="sv-sprint-card" style={{ zIndex: openMenuId === sprint.id ? 50 : 1 }}>
                
                <div className="sv-header">
                  <div>
                    <h2 className="sv-title">{sprint.name}</h2>
                    <p className="sv-dates">{sprint.startDate} &nbsp;→&nbsp; {sprint.endDate}</p>
                  </div>
                  <div className="sv-actions">
                   <button onClick={() => openAddStoryModal(sprint.id)} className="sv-add-issues-btn">+ Add Issues</button>
                    
                    <div className="menu-container">
                      <button className="options-btn" onClick={(e) => { e.stopPropagation(); setOpenMenuId(openMenuId === sprint.id ? null : sprint.id); }}>⋮</button>
                      
                      {openMenuId === sprint.id && (
                        <div className="dropdown-menu sv-dropdown-menu">
                          <button className="dropdown-item" onClick={() => openModal(sprint)}>Edit Sprint</button>
                          <button className="dropdown-item" style={{color: '#e74c3c'}} onClick={() => handleDeleteSprint(sprint.id)}>Delete Sprint</button>
                        </div>
                      )}
                    </div>

                  </div>
                </div>

                <div className="sv-body">
                  {sprintStories.length > 0 ? (
                    <div className="sv-story-list">
                      {sprintStories.map(story => (
                        <div key={story.id} className="sv-story-item">
                          <div>
                            <div className="sv-story-id">#{story.id}</div>
                            <h3 className="sv-story-title">{story.title}</h3>
                          </div>
                          <button onClick={() => handleRemoveStoryFromSprint(story.id)} className="sv-remove-btn">✕ Remove</button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="sv-empty-text">Sprint is empty.</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2 className="modal-title">{editingSprintId ? 'Edit Sprint' : 'Create New Sprint'}</h2>
            <form className="modal-form" onSubmit={handleSaveSprint}>
              <div className="form-group"><label>Sprint Name</label><input type="text" className="modal-input" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} required/></div>
              <div className="form-row">
                <div className="form-group"><label>Start Date</label><input type="date" className="modal-input" value={formData.startDate} onChange={(e) => setFormData({...formData, startDate: e.target.value})} required/></div>
                <div className="form-group"><label>End Date</label><input type="date" className="modal-input" value={formData.endDate} onChange={(e) => setFormData({...formData, endDate: e.target.value})} required/></div>
              </div>
              <div className="modal-actions"><button type="button" className="modal-btn cancel-btn" onClick={() => setIsModalOpen(false)}>Cancel</button><button type="submit" className="modal-btn save-btn">Save Sprint</button></div>
            </form>
          </div>
        </div>
      )}

      {isAddStoryModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{maxWidth: '600px'}}>
            <h2 className="modal-title">Pull Issues from Backlog</h2>
            <form className="modal-form" onSubmit={handleSaveAssignedStories}>
              
              <div className="sv-pull-list">
                {unassignedStories.length > 0 ? (
                  unassignedStories.map(story => (
                    <label key={story.id} className={`sv-pull-item ${selectedStoryIds.includes(story.id) ? 'selected' : ''}`}>
                      <input type="checkbox" checked={selectedStoryIds.includes(story.id)} onChange={() => toggleStorySelection(story.id)} />
                      <div className="sv-pull-item-title">{story.title}</div>
                    </label>
                  ))
                ) : (
                  <p style={{textAlign: 'center', color: 'var(--text-muted)'}}>No unassigned stories!</p>
                )}
              </div>

              <div className="modal-actions">
                <button type="button" className="modal-btn cancel-btn" onClick={() => setIsAddStoryModalOpen(false)}>Cancel</button>
                <button type="submit" className="modal-btn save-btn">Add Issues</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default SprintsViewMock;