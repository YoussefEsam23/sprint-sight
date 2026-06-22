import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { createPortal } from 'react-dom'; 
import '../styling/BacklogView.css';
import CustomDropdown from './CustomDropdown';

const BacklogView = () => {
  const { projectId } = useParams(); 
  
  const [issues, setIssues] = useState([]);
  const [types, setTypes] = useState([]);
  const [priorities, setPriorities] = useState([]);
  const [statuses, setStatuses] = useState([]);
  const [members, setMembers] = useState([]);
  
  const [isLoading, setIsLoading] = useState(true);
  const [openMenuId, setOpenMenuId] = useState(null);
  
  const [editingIssueId, setEditingIssueId] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formErrors, setFormErrors] = useState({});
  const [formData, setFormData] = useState({ 
    title: '', description: '', typeId: '', priorityId: '', statusId: '', storyPoints: '', assignedTo: '' 
  });

  const getCookie = (name) => {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
    return null;
  };

  const fetchBacklogData = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('sprintSightToken');
      const headers = {
        'Authorization': `Bearer ${token}`,
        'X-XSRF-TOKEN': getCookie('XSRF-TOKEN'),
        'Content-Type': 'application/json'
      };

      const [issuesRes, typesRes, prioritiesRes, statusesRes, membersRes] = await Promise.all([
        fetch(`/api/projects/${projectId}/issues`, { headers }),
        fetch(`/api/projects/${projectId}/configurations/types`, { headers }),
        fetch(`/api/projects/${projectId}/configurations/priorities`, { headers }),
        fetch(`/api/projects/${projectId}/configurations/statuses`, { headers }),
        fetch(`/api/projects/${projectId}/members`, { headers })
      ]);

      if (issuesRes.ok) setIssues((await issuesRes.json()).data || []);
      if (typesRes.ok) setTypes((await typesRes.json()).data || []);
      if (prioritiesRes.ok) setPriorities((await prioritiesRes.json()).data || []);
      if (statusesRes.ok) setStatuses((await statusesRes.json()).data || []);
      if (membersRes.ok) setMembers((await membersRes.json()).data || []);

    } catch (error) {
      console.error("Error fetching backlog data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // THE FIX: Uses mousedown and checks if you clicked outside safely
    const handleClickOutside = (e) => {
      if (!e.target.closest('.bv-menu-container')) {
        setOpenMenuId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    
    if (projectId) fetchBacklogData();
    
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [projectId]);

  const handleMenuClick = (id) => { 
    setOpenMenuId(openMenuId === id ? null : id); 
  };

  const openIssueModal = (issue = null) => {
    if (issue) {
      setEditingIssueId(issue.id);
      setFormData({ 
        title: issue.title || '', 
        description: issue.description || '', 
        typeId: issue.type?.id || types[0]?.id || '', 
        priorityId: issue.priority?.id || priorities[0]?.id || '', 
        statusId: issue.status?.id || statuses[0]?.id || '', 
        storyPoints: issue.storyPoints || '', 
        assignedTo: issue.assignedTo?.id || '' 
      });
    } else {
      setEditingIssueId(null);
      const defaultType = types.find(t => t.isDefault) || types[0];
      const defaultPriority = priorities.find(p => p.isDefault) || priorities[0];
      const defaultStatus = statuses.find(s => s.isDefault) || statuses[0];

      setFormData({ 
        title: '', description: '', 
        typeId: defaultType?.id || '', 
        priorityId: defaultPriority?.id || '', 
        statusId: defaultStatus?.id || '', 
        storyPoints: '', assignedTo: '' 
      });
    }
    setFormErrors({}); 
    setIsModalOpen(true); 
    setOpenMenuId(null);
  };

  const handleDeleteIssue = async (e, id) => {
    e.stopPropagation();
    if (!window.confirm("Are you sure you want to delete this issue?")) return;
    
    setOpenMenuId(null);
    try {
      const response = await fetch(`/api/projects/${projectId}/issues/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('sprintSightToken')}`,
          'X-XSRF-TOKEN': getCookie('XSRF-TOKEN')
        }
      });

      if (response.ok) {
        setIssues(issues.filter(issue => issue.id !== id));
      } else {
        alert("Failed to delete issue.");
      }
    } catch (error) {
      console.error("Error deleting issue:", error);
    }
  };

  const handleSaveIssue = async (e) => {
    e.preventDefault();
    if (!formData.title.trim()) { setFormErrors({title: "Title is required."}); return; }
    if (!formData.typeId) { setFormErrors({typeId: "Issue Type is required."}); return; }
    if (!formData.priorityId) { setFormErrors({priorityId: "Priority is required."}); return; }

    const payload = {
      title: formData.title,
      description: formData.description || null,
      typeId: formData.typeId,
      priorityId: formData.priorityId,
      storyPoints: formData.storyPoints ? parseInt(formData.storyPoints) : null,
      assignedTo: formData.assignedTo || null
    };

    if (editingIssueId && formData.statusId) {
      payload.statusId = formData.statusId;
    }

    try {
      const url = editingIssueId ? `/api/projects/${projectId}/issues/${editingIssueId}` : `/api/projects/${projectId}/issues`;
      const method = editingIssueId ? 'PATCH' : 'POST';

      const response = await fetch(url, {
        method: method,
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('sprintSightToken')}`,
          'X-XSRF-TOKEN': getCookie('XSRF-TOKEN'),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        fetchBacklogData(); 
        setIsModalOpen(false);
      } else {
        const errData = await response.json();
        alert(`Failed to save issue: ${errData.message || 'Validation error'}`);
      }
    } catch (error) {
      console.error("Error saving issue:", error);
    }
  };

  return (
    <>
      <div className="bv-container">
        <div className="bv-header">
          <div>
            <p className="bv-subtitle">BACKLOG OVERVIEW</p>
            <h1 className="bv-title">Product Backlog</h1>
          </div>
          <div className="bv-header-actions">
            <button className="bv-create-btn" onClick={() => openIssueModal()}>+ CREATE ISSUE</button>
          </div>
        </div>

        {isLoading ? (
          <div className="bv-empty-state">
            <h2>Loading Issues...</h2>
          </div>
        ) : (
          <div className="story-list">
            {issues.map(issue => (
              <div key={issue.id} className="story-card" style={{ zIndex: openMenuId === issue.id ? 50 : 1 }}>
                
                <div className="story-info">
                  <div style={{display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px'}}>
                    <span style={{fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--accent-color)', textTransform: 'uppercase'}}>
                      {issue.type?.name || 'Issue'}
                    </span>
                    <span className="story-id" style={{fontSize: '0.75rem'}}>
                      #{issue.id?.substring(0, 6)}
                    </span>
                  </div>
                  
                  <h3 className="story-title">{issue.title}</h3>
                  {issue.description && <p className="story-desc">{issue.description}</p>}
                  
                  <div className="bv-story-meta">
                    {issue.assignedTo && <span className="bv-badge">👤 {issue.assignedTo.username}</span>}
                    {issue.status && <span>Status: <strong className="bv-badge-highlight" style={{background: 'none', padding: 0}}>{issue.status.name}</strong></span>}
                    {issue.priority && <span>Priority: <strong>{issue.priority.name}</strong></span>}
                    {issue.storyPoints !== null && <span className="bv-badge">Points: {issue.storyPoints}</span>}
                  </div>
                </div>
                
                <div className="bv-menu-container">
                  <button type="button" className="bv-options-btn" onClick={() => handleMenuClick(issue.id)}>⋮</button>
                  {openMenuId === issue.id && (
                    <div className="bv-dropdown-menu">
                      <button type="button" className="bv-dropdown-item" onClick={(e) => { e.stopPropagation(); openIssueModal(issue); }}>✏️ Edit Issue</button>
                      <button type="button" className="bv-dropdown-item" style={{color: '#e74c3c'}} onClick={(e) => handleDeleteIssue(e, issue.id)}>🗑️ Delete Issue</button>
                    </div>
                  )}
                </div>
              </div>
            ))}
            
            {issues.length === 0 && (
              <div className="bv-empty-state">
                <h2>Your backlog is empty.</h2>
                <p>Click '+ Create Issue' to start planning your project.</p>
              </div>
            )}
          </div>
        )}
      </div>

      {isModalOpen && createPortal(
        <div className="bv-modal-overlay">
          <div className="bv-modal-content">
            <h2 className="bv-modal-title">{editingIssueId ? 'Edit Issue' : 'Create New Issue'}</h2>
            
            <form className="bv-modal-form" onSubmit={handleSaveIssue}>
              
              <div className="bv-form-group">
                <label>Issue Title</label>
                <input type="text" className="bv-modal-input" placeholder="e.g., Integrate Payment Gateway" value={formData.title} onChange={(e) => setFormData({...formData, title: e.target.value})} />
                {formErrors.title && <span className="bv-form-error">{formErrors.title}</span>}
              </div>
              
              <div className="bv-form-group">
                <label>Description</label>
                <textarea className="bv-modal-input" placeholder="Detailed description..." value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} />
              </div>
              
              <div className="bv-form-row">
                <div className="bv-form-group">
                  <label>Issue Type</label>
                  <CustomDropdown 
                    currentValue={formData.typeId}
                    options={types.map(t => ({ value: t.id, label: t.name }))}
                    onChange={(val) => setFormData({...formData, typeId: val})}
                  />
                  {formErrors.typeId && <span className="bv-form-error">{formErrors.typeId}</span>}
                </div>

                <div className="bv-form-group">
                  <label>Priority</label>
                  <CustomDropdown 
                    currentValue={formData.priorityId}
                    options={priorities.map(p => ({ value: p.id, label: p.name }))}
                    onChange={(val) => setFormData({...formData, priorityId: val})}
                  />
                  {formErrors.priorityId && <span className="bv-form-error">{formErrors.priorityId}</span>}
                </div>
              </div>

              <div className="bv-form-row">
                <div className="bv-form-group">
                  <label>Status</label>
                  <CustomDropdown 
                    currentValue={formData.statusId}
                    options={statuses.map(s => ({ value: s.id, label: s.name }))}
                    onChange={(val) => setFormData({...formData, statusId: val})}
                  />
                </div>

                <div className="bv-form-group">
                  <label>Story Points</label>
                  <input type="number" min="0" max="100" className="bv-modal-input" placeholder="e.g. 5" value={formData.storyPoints} onChange={(e) => setFormData({...formData, storyPoints: e.target.value})} />
                </div>
              </div>

              <div className="bv-form-group">
                <label>Assign To</label>
                <CustomDropdown 
                  currentValue={formData.assignedTo}
                  options={[
                    { value: '', label: 'Unassigned' },
                    ...members.map(m => ({ 
                      value: m.member.id, 
                      label: `${m.member.fullName || m.member.username} (@${m.member.username})` 
                    }))
                  ]}
                  onChange={(val) => setFormData({...formData, assignedTo: val})}
                />
              </div>

              <div className="bv-modal-actions">
                <button type="button" className="bv-btn bv-cancel-btn" onClick={() => setIsModalOpen(false)}>Cancel</button>
                <button type="submit" className="bv-btn bv-save-btn">{editingIssueId ? 'Save Changes' : 'Create Issue'}</button>
              </div>
            </form>
          </div>
        </div>,
        document.body 
      )}
    </>
  );
};

export default BacklogView;