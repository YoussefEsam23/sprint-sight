import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';

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
      <div className="content-left" style={{ maxWidth: '100%' }}>
        <div className="page-header">
          <div><p className="page-subtitle">SPRINTS OVERVIEW</p><h1 className="page-title">Active Sprints</h1></div>
          <div className="header-actions"><button className="new-story-btn" onClick={() => openModal()}>+ CREATE SPRINT</button></div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          {sprints.map(sprint => {
            const sprintStories = allStories.filter(story => story.sprintId === sprint.id);
            return (
              <div key={sprint.id} style={{ background: 'var(--bg-card)', borderRadius: '12px', padding: '1.5rem', boxShadow: 'var(--card-shadow)', border: '1px solid var(--border-color)', position: 'relative', zIndex: openMenuId === sprint.id ? 50 : 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' }}>
                  <div>
                    <h2 style={{ color: 'var(--text-main)', fontSize: '1.4rem', margin: '0 0 0.3rem 0' }}>{sprint.name}</h2>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', margin: 0, fontWeight: '600' }}>{sprint.startDate} &nbsp;→&nbsp; {sprint.endDate}</p>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                   <button onClick={() => openAddStoryModal(sprint.id)} className="add-issues-btn">+ Add Issues</button>
                    <div className="menu-container">
                      <button className="options-btn" onClick={(e) => { e.stopPropagation(); setOpenMenuId(openMenuId === sprint.id ? null : sprint.id); }}>⋮</button>
                      {openMenuId === sprint.id && (
                        <div className="dropdown-menu" style={{top: '100%', right: '0'}}>
                          <button className="dropdown-item" onClick={() => openModal(sprint)}>✏️ Edit Sprint</button>
                          <button className="dropdown-item" style={{color: '#e74c3c'}} onClick={() => handleDeleteSprint(sprint.id)}>🗑️ Delete Sprint</button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div style={{ minHeight: '100px', background: 'var(--bg-main)', borderRadius: '8px', padding: '1rem', border: '1px dashed var(--border-color)' }}>
                  {sprintStories.length > 0 ? (
                    <div className="story-list" style={{ gap: '0.8rem' }}>
                      {sprintStories.map(story => (
                        <div key={story.id} className="story-card" style={{ padding: '1rem', borderLeft: '4px solid var(--accent-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div>
                            <div className="story-id">#{story.id}</div>
                            <h3 className="story-title" style={{ fontSize: '1.1rem', margin: '0.2rem 0' }}>{story.title}</h3>
                          </div>
                          <button onClick={() => handleRemoveStoryFromSprint(story.id)} style={{ background: 'none', border: 'none', color: '#e74c3c', fontSize: '0.85rem', fontWeight: 'bold', cursor: 'pointer' }}>✕ Remove</button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem 0' }}>Sprint is empty.</div>
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
              <div style={{ maxHeight: '300px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                {unassignedStories.length > 0 ? (
                  unassignedStories.map(story => (
                    <label key={story.id} style={{ display: 'flex', gap: '1rem', padding: '1rem', background: 'var(--bg-main)', borderRadius: '8px', cursor: 'pointer', border: selectedStoryIds.includes(story.id) ? '2px solid var(--accent-color)' : '2px solid transparent' }}>
                      <input type="checkbox" checked={selectedStoryIds.includes(story.id)} onChange={() => toggleStorySelection(story.id)} />
                      <div><strong style={{color: 'var(--text-main)'}}>{story.title}</strong></div>
                    </label>
                  ))
                ) : (
                  <p style={{textAlign: 'center', color: 'var(--text-muted)'}}>No unassigned stories!</p>
                )}
              </div>
              <div className="modal-actions"><button type="button" className="modal-btn cancel-btn" onClick={() => setIsAddStoryModalOpen(false)}>Cancel</button><button type="submit" className="modal-btn save-btn">Add Issues</button></div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};
export default SprintsViewMock;