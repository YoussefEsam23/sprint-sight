import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { createPortal } from 'react-dom'; // <-- PORTAL IMPORT
import '../styling/SprintsView.css';

const SprintsView = () => {
  const { projectId } = useParams(); 
  
  const [sprints, setSprints] = useState([]);
  const [allIssues, setAllIssues] = useState([]); 
  const [currentUserRole, setCurrentUserRole] = useState('VIEWER'); 
  const [isLoading, setIsLoading] = useState(true);
  
  const [openMenuId, setOpenMenuId] = useState(null);
  const [editingSprintId, setEditingSprintId] = useState(null);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({ name: '', goal: '', startDate: '', endDate: '' });
  
  const [isAddStoryModalOpen, setIsAddStoryModalOpen] = useState(false);
  const [targetSprintId, setTargetSprintId] = useState(null);
  const [selectedIssueIds, setSelectedIssueIds] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const getCookie = (name) => {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
    return null;
  };

  const getAuthHeaders = () => ({
    'Authorization': `Bearer ${localStorage.getItem('sprintSightToken')}`,
    'X-XSRF-TOKEN': getCookie('XSRF-TOKEN'),
    'Content-Type': 'application/json'
  });

  const fetchSprintsData = async () => {
    setIsLoading(true);
    try {
      const headers = getAuthHeaders();

      const issuesRes = await fetch(`/api/projects/${projectId}/issues`, { headers });
      if (issuesRes.ok) {
        setAllIssues((await issuesRes.json()).data || []);
      }

      const membersRes = await fetch(`/api/projects/${projectId}/members`, { headers });
      if (membersRes.ok) {
        const membersData = await membersRes.json();
        const storedUser = JSON.parse(localStorage.getItem('sprintSightUser')) || {};
        const myRecord = (membersData.data || []).find(m => m.member.id === storedUser.id);
        
        if (myRecord) {
          setCurrentUserRole(myRecord.projectRole);
        }
      }

      const sprintsSummaryRes = await fetch(`/api/projects/${projectId}/sprints`, { headers });
      if (sprintsSummaryRes.ok) {
        const summaries = (await sprintsSummaryRes.json()).data || [];
        const detailsPromises = summaries.map(s => 
          fetch(`/api/projects/${projectId}/sprints/${s.id}`, { headers }).then(res => res.json())
        );
        const detailsResults = await Promise.all(detailsPromises);
        setSprints(detailsResults.map(res => res.data));
      }
    } catch (error) {
      console.error("Error fetching sprints data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const handleClickOutside = () => setOpenMenuId(null);
    document.addEventListener('click', handleClickOutside);
    if (projectId) fetchSprintsData();
    return () => document.removeEventListener('click', handleClickOutside);
  }, [projectId]);

  // --- STRICT RBAC CHECKS ---
  // Typically, Product Owners build the Backlog, but only Scrum Masters or Creators build Sprints!
  const canManageSprints = ['CREATOR', 'SCRUM_MASTER'].includes(currentUserRole);

  const openModal = (sprint = null) => {
    if (sprint) { 
      setEditingSprintId(sprint.id); 
      setFormData({ name: sprint.name || '', goal: sprint.goal || '', startDate: sprint.startDate || '', endDate: sprint.endDate || '' }); 
    } else { 
      setEditingSprintId(null); 
      setFormData({ name: '', goal: '', startDate: '', endDate: '' }); 
    }
    setIsModalOpen(true); 
    setOpenMenuId(null);
  };

  const handleSaveSprint = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const url = editingSprintId ? `/api/projects/${projectId}/sprints/${editingSprintId}` : `/api/projects/${projectId}/sprints`;
      const method = editingSprintId ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method: method,
        headers: getAuthHeaders(),
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        await fetchSprintsData(); 
        setIsModalOpen(false);
      } else {
        const err = await response.json();
        alert(`Failed to save sprint: ${err.message || 'Check your permissions!'}`);
      }
    } catch (error) {
      console.error("Error saving sprint:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const openAddStoryModal = (sprintId) => { 
    setTargetSprintId(sprintId); 
    setSelectedIssueIds([]); 
    setIsAddStoryModalOpen(true); 
  };

  const toggleIssueSelection = (issueId) => {
    setSelectedIssueIds(prev => prev.includes(issueId) ? prev.filter(id => id !== issueId) : [...prev, issueId]);
  };

  const handleSaveAssignedStories = async (e) => {
    e.preventDefault();
    if (selectedIssueIds.length === 0) return setIsAddStoryModalOpen(false);
    
    setIsSubmitting(true);
    try {
      const headers = getAuthHeaders();
      const promises = selectedIssueIds.map(issueId => 
        fetch(`/api/projects/${projectId}/sprints/${targetSprintId}/issues/${issueId}`, { method: 'POST', headers })
      );
      await Promise.all(promises);
      await fetchSprintsData(); 
      setIsAddStoryModalOpen(false);
    } catch (error) {
      alert("Error adding issues.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemoveStoryFromSprint = async (sprintId, issueId) => {
    if (!window.confirm("Remove this issue from the sprint?")) return;
    try {
      const response = await fetch(`/api/projects/${projectId}/sprints/${sprintId}/issues/${issueId}`, { method: 'DELETE', headers: getAuthHeaders() });
      if (response.ok) await fetchSprintsData();
    } catch (error) {
      console.error("Error removing issue from sprint:", error);
    }
  };

  const assignedIssueIds = new Set();
  sprints.forEach(sprint => sprint.issues?.forEach(item => { if (!item.removedAt) assignedIssueIds.add(item.issue.id); }));
  const unassignedIssues = allIssues.filter(issue => !assignedIssueIds.has(issue.id));

  return (
    <>
      <div className="content-left">
        <div className="page-header">
          <div><p className="page-subtitle">SPRINTS OVERVIEW</p><h1 className="page-title">Active Sprints</h1></div>
          <div className="header-actions">
            {canManageSprints && <button className="new-story-btn" onClick={() => openModal()}>+ CREATE SPRINT</button>}
          </div>
        </div>

        {isLoading ? (
          <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>
            <h3>Loading sprints...</h3>
          </div>
        ) : (
          <div className="sv-container">
            {sprints.map(sprint => {
              const activeSprintIssues = (sprint.issues || []).filter(item => !item.removedAt);

              return (
                <div key={sprint.id} className="sv-sprint-card" style={{ zIndex: openMenuId === sprint.id ? 50 : 1 }}>
                  <div className="sv-header">
                    <div>
                      <h2 className="sv-title">{sprint.name}</h2>
                      <p className="sv-dates">{sprint.startDate} &nbsp;→&nbsp; {sprint.endDate}</p>
                      {sprint.goal && <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '6px' }}>Goal: {sprint.goal}</p>}
                    </div>
                    
                    <div className="sv-actions">
                     {canManageSprints && <button onClick={() => openAddStoryModal(sprint.id)} className="sv-add-issues-btn">+ Add Issues</button>}
                     
                     {canManageSprints && (
                      <div className="menu-container">
                        <button className="options-btn" onClick={(e) => { e.stopPropagation(); setOpenMenuId(openMenuId === sprint.id ? null : sprint.id); }}>⋮</button>
                        {openMenuId === sprint.id && (
                          <div className="dropdown-menu sv-dropdown-menu">
                            <button className="dropdown-item" onClick={() => openModal(sprint)}>✏️ Edit Sprint</button>
                          </div>
                        )}
                      </div>
                     )}
                    </div>
                  </div>

                  <div className="sv-body">
                    {activeSprintIssues.length > 0 ? (
                      <div className="sv-story-list">
                        {activeSprintIssues.map(item => (
                          <div key={item.issue.id} className="sv-story-item">
                            <div>
                              <div className="sv-story-id" style={{ display: 'flex', alignItems: 'center', gap: '8px'}}>
                                <span style={{color: 'var(--accent-color)', textTransform: 'uppercase'}}>{item.issue.type?.name || 'Issue'}</span>
                                #{item.issue.id.substring(0, 6)}
                              </div>
                              <h3 className="sv-story-title">{item.issue.title}</h3>
                            </div>
                            {canManageSprints && <button onClick={() => handleRemoveStoryFromSprint(sprint.id, item.issue.id)} className="sv-remove-btn">✕ Remove</button>}
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

            {sprints.length === 0 && (
              <div style={{ textAlign: 'center', padding: '4rem', background: 'var(--bg-card)', borderRadius: '12px', border: '1px dashed var(--border-color)' }}>
                <h3 style={{ color: 'var(--text-main)', marginBottom: '0.5rem' }}>No sprints found</h3>
                <p style={{ color: 'var(--text-muted)' }}>{canManageSprints ? "Create a sprint to start organizing your active issues." : "Waiting for the Scrum Master to create a sprint."}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* --- REACT PORTAL FOR SPRINT CREATION --- */}
      {isModalOpen && canManageSprints && createPortal(
        <div className="sv-modal-overlay">
          <div className="sv-modal-content">
            <h2 className="sv-modal-title">{editingSprintId ? 'Edit Sprint' : 'Create New Sprint'}</h2>
            <form className="sv-modal-form" onSubmit={handleSaveSprint}>
              <div className="sv-form-group">
                <label>Sprint Name</label>
                <input type="text" className="sv-modal-input" placeholder="e.g. Sprint 1" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} required/>
              </div>
              <div className="sv-form-group">
                <label>Sprint Goal (Optional)</label>
                <textarea className="sv-modal-input" placeholder="What is the main objective of this sprint?" style={{minHeight: '80px'}} value={formData.goal} onChange={(e) => setFormData({...formData, goal: e.target.value})} />
              </div>
              <div className="sv-form-row">
                <div className="sv-form-group"><label>Start Date</label><input type="date" className="sv-modal-input" value={formData.startDate} onChange={(e) => setFormData({...formData, startDate: e.target.value})} required/></div>
                <div className="sv-form-group"><label>End Date</label><input type="date" className="sv-modal-input" value={formData.endDate} onChange={(e) => setFormData({...formData, endDate: e.target.value})} required/></div>
              </div>
              <div className="sv-modal-actions">
                <button type="button" disabled={isSubmitting} className="sv-btn sv-cancel-btn" onClick={() => setIsModalOpen(false)}>Cancel</button>
                <button type="submit" disabled={isSubmitting} className="sv-btn sv-save-btn">{isSubmitting ? 'Saving...' : 'Save Sprint'}</button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* --- REACT PORTAL FOR PULLING ISSUES --- */}
      {isAddStoryModalOpen && canManageSprints && createPortal(
        <div className="sv-modal-overlay">
          <div className="sv-modal-content" style={{maxWidth: '600px'}}>
            <h2 className="sv-modal-title">Pull Issues from Backlog</h2>
            <form className="sv-modal-form" onSubmit={handleSaveAssignedStories}>
              <div className="sv-pull-list">
                {unassignedIssues.length > 0 ? (
                  unassignedIssues.map(issue => (
                    <label key={issue.id} className={`sv-pull-item ${selectedIssueIds.includes(issue.id) ? 'selected' : ''}`}>
                      <input type="checkbox" checked={selectedIssueIds.includes(issue.id)} onChange={() => toggleIssueSelection(issue.id)} />
                      <div className="sv-pull-item-title">
                        <span style={{color: 'var(--text-muted)', fontSize: '0.8rem', marginRight: '10px'}}>#{issue.id.substring(0, 6)}</span>
                        {issue.title}
                      </div>
                    </label>
                  ))
                ) : (
                  <p style={{textAlign: 'center', color: 'var(--text-muted)'}}>No unassigned issues in the backlog!</p>
                )}
              </div>
              <div className="sv-modal-actions">
                <button type="button" disabled={isSubmitting} className="sv-btn sv-cancel-btn" onClick={() => setIsAddStoryModalOpen(false)}>Cancel</button>
                <button type="submit" disabled={isSubmitting} className="sv-btn sv-save-btn">{isSubmitting ? 'Adding...' : 'Add Issues'}</button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </>
  );
};

export default SprintsView;