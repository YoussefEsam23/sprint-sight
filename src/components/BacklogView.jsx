import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { createPortal } from 'react-dom'; 
import '../styling/BacklogView.css';

import CustomDropdown from './CustomDropdown';
import MultiSelectDropdown from './MultiSelectDropdown'; 
import IssueComments from './IssueComments';

const BacklogView = () => {
  const { projectId } = useParams(); 
  
  const [issues, setIssues] = useState([]);
  const [types, setTypes] = useState([]);
  const [priorities, setPriorities] = useState([]);
  const [statuses, setStatuses] = useState([]);
  const [members, setMembers] = useState([]);
  const [projectComponents, setProjectComponents] = useState([]); 
  
  const [isLoading, setIsLoading] = useState(true);
  const [openMenuId, setOpenMenuId] = useState(null);
  
  const [editingIssueId, setEditingIssueId] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false); 
  const [viewingIssue, setViewingIssue] = useState(null); 

  // --- NEW STATES FOR CUSTOM ISSUE TYPE ---
  const [isCreateTypeModalOpen, setIsCreateTypeModalOpen] = useState(false);
  const [newTypeName, setNewTypeName] = useState('');
  const [isCreatingType, setIsCreatingType] = useState(false);

  const [formErrors, setFormErrors] = useState({});
  const [formData, setFormData] = useState({ 
    title: '', description: '', typeId: '', priorityId: '', statusId: '', storyPoints: '', assignedTo: '',
    componentIds: [] 
  });

  const storedUser = JSON.parse(localStorage.getItem('sprintSightUser')) || {};
  const currentUserId = storedUser.id;
  const myRecord = members.find(m => m.member.id === currentUserId);
  const currentUserRole = myRecord ? myRecord.projectRole : 'VIEWER';

  const getCookie = (name) => {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
    return null;
  };

  const fetchBacklogData = async () => {
    setIsLoading(true);
    try {
      const headers = {
        'Authorization': `Bearer ${localStorage.getItem('sprintSightToken')}`,
        'X-XSRF-TOKEN': getCookie('XSRF-TOKEN'),
        'Content-Type': 'application/json'
      };

      const [issuesRes, typesRes, prioritiesRes, statusesRes, membersRes, componentsRes] = await Promise.all([
        fetch(`/api/projects/${projectId}/issues`, { headers }),
        fetch(`/api/projects/${projectId}/configurations/types`, { headers }),
        fetch(`/api/projects/${projectId}/configurations/priorities`, { headers }),
        fetch(`/api/projects/${projectId}/configurations/statuses`, { headers }),
        fetch(`/api/projects/${projectId}/members`, { headers }),
        fetch(`/api/projects/${projectId}/components`, { headers }) 
      ]);

      if (issuesRes.ok) setIssues((await issuesRes.json()).data || []);
      if (typesRes.ok) setTypes((await typesRes.json()).data || []);
      if (prioritiesRes.ok) setPriorities((await prioritiesRes.json()).data || []);
      if (statusesRes.ok) setStatuses((await statusesRes.json()).data || []);
      if (membersRes.ok) setMembers((await membersRes.json()).data || []);
      if (componentsRes.ok) setProjectComponents((await componentsRes.json()).data || []);

    } catch (error) {
      console.error("Error fetching backlog data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (!e.target.closest('.bv-menu-container')) setOpenMenuId(null);
    };
    document.addEventListener('mousedown', handleClickOutside);
    if (projectId) fetchBacklogData();
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [projectId]);

  const handleMenuClick = (e, id) => { 
    e.stopPropagation(); 
    setOpenMenuId(openMenuId === id ? null : id); 
  };

  const openIssueModal = (issue = null) => {
    setViewingIssue(null); 
    if (issue) {
      setEditingIssueId(issue.id);
      setFormData({ 
        title: issue.title || '', 
        description: issue.description || '', 
        typeId: issue.type?.id || types[0]?.id || '', 
        priorityId: issue.priority?.id || priorities[0]?.id || '', 
        statusId: issue.status?.id || statuses[0]?.id || '', 
        storyPoints: issue.storyPoints || '', 
        assignedTo: issue.assignedTo?.id || '',
        componentIds: issue.components ? issue.components.map(c => c.id) : [] 
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
        storyPoints: '', assignedTo: '',
        componentIds: [] 
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
    setViewingIssue(null);
    try {
      const response = await fetch(`/api/projects/${projectId}/issues/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('sprintSightToken')}`, 'X-XSRF-TOKEN': getCookie('XSRF-TOKEN') }
      });
      if (response.ok) setIssues(issues.filter(issue => issue.id !== id));
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
      assignedTo: formData.assignedTo || null,
      componentIds: formData.componentIds
    };

    if (editingIssueId && formData.statusId) payload.statusId = formData.statusId;

    try {
      const url = editingIssueId ? `/api/projects/${projectId}/issues/${editingIssueId}` : `/api/projects/${projectId}/issues`;
      const method = editingIssueId ? 'PATCH' : 'POST';

      const response = await fetch(url, {
        method: method,
        headers: { 'Authorization': `Bearer ${localStorage.getItem('sprintSightToken')}`, 'X-XSRF-TOKEN': getCookie('XSRF-TOKEN'), 'Content-Type': 'application/json' },
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

  // --- NEW: API FUNCTION TO CREATE CUSTOM ISSUE TYPE ---
  const handleCreateType = async (e) => {
    e.preventDefault();
    if (!newTypeName.trim()) return;
    
    setIsCreatingType(true);
    try {
      const response = await fetch(`/api/projects/${projectId}/configurations/types`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${localStorage.getItem('sprintSightToken')}`, 
          'X-XSRF-TOKEN': getCookie('XSRF-TOKEN'), 
          'Content-Type': 'application/json' 
        },
        body: JSON.stringify({ name: newTypeName, isDefault: false })
      });
      
      if (response.ok) {
        const resData = await response.json();
        const newType = resData.data || resData;
        
        setTypes([...types, newType]); // Add to local state list
        setFormData({ ...formData, typeId: newType.id }); // Auto-select the newly created type
        
        setIsCreateTypeModalOpen(false);
        setNewTypeName('');
      } else {
        const errData = await response.json();
        alert(`Failed to create issue type: ${errData.message || 'Error'}`);
      }
    } catch (error) {
      console.error("Error creating type:", error);
    } finally {
      setIsCreatingType(false);
    }
  };

  const togglewidth =() => {
    if(issues.length === 0)
    {
      document.querySelector(".story-list").classList.add("story-list-empty");
      document.querySelector(".story-list").classList.remove("story-list");
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
          <div className="bv-empty-state" style={{ width : "100%"}}>
            <h2>Loading Issues...</h2>
          </div>
        ) : (
          <div className={issues.length === 0 ? "story-list-empty" : "story-list"} >
            {issues.map(issue => (
              <div key={issue.id} className={`story-card ${openMenuId === issue.id ? 'bv-card-top' : ''}`} onClick={() => setViewingIssue(issue)}>
                <div className="story-info">
                  <div className="bv-issue-header-row">
                    <span className="bv-issue-type">
                      {issue.type?.name || 'Issue'}
                    </span>
                  </div>
                  
                  <h3 className="story-title">{issue.title}</h3>
                  {issue.description && <p className="story-desc">{issue.description}</p>}
                  
                  <div className="bv-story-meta">
                    {issue.components && issue.components.length > 0 && (
                      <span className="bv-badge bv-badge-components">
                        🧩 {issue.components.map(c => c.name).join(', ')}
                      </span>
                    )}
                    {issue.assignedTo && <span className="bv-badge">👤 {issue.assignedTo.username}</span>}
                    {issue.status && <span>Status: <strong className="bv-badge-highlight bv-badge-no-bg">{issue.status.name}</strong></span>}
                    {issue.priority && <span>Priority: <strong>{issue.priority.name}</strong></span>}
                    {issue.storyPoints !== null && <span className="bv-badge">Points: {issue.storyPoints}</span>}
                  </div>
                </div>
                
                <div className="bv-menu-container">
                  <button type="button" className="bv-options-btn" onClick={(e) => handleMenuClick(e, issue.id)}>⋮</button>
                  {openMenuId === issue.id && (
                    <div className="bv-dropdown-menu">
                      <button type="button" className="bv-dropdown-item" onClick={(e) => { e.stopPropagation(); openIssueModal(issue); }}>✏️ Edit Issue</button>
                      <button type="button" className="bv-dropdown-item bv-text-danger" onClick={(e) => handleDeleteIssue(e, issue.id)}>🗑️ Delete Issue</button>
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

      {/* ======================================================== */}
      {/* MODAL 1: VIEW DETAILS & COMMENTS                         */}
      {/* ======================================================== */}
      {viewingIssue && createPortal(
        <div className="bv-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setViewingIssue(null); }}>
          <div className="bv-view-modal">
            
            <div className="bv-view-left">
              <div className="bv-view-meta-header">
                <span className="bv-view-meta-label">
                  {viewingIssue.type?.name || 'Issue'}
                </span>
              </div>
              
              <h2 className="bv-view-title-text">
                {viewingIssue.title}
              </h2>
              
              <div className="bv-view-section">
                <h4 className="bv-view-section-title">Description</h4>
                <p className="bv-view-desc-text">
                  {viewingIssue.description || <span style={{ fontStyle: 'italic', color: 'var(--text-muted)' }}>No description provided.</span>}
                </p>
              </div>

              <div className="bv-view-badges-row">
                {viewingIssue.components && viewingIssue.components.length > 0 && (
                  <span className="bv-badge bv-badge-components bv-badge-lg">
                    🧩 {viewingIssue.components.map(c => c.name).join(', ')}
                  </span>
                )}
                {viewingIssue.assignedTo && <span className="bv-badge bv-badge-lg">👤 Assignee: <strong>{viewingIssue.assignedTo.fullName || viewingIssue.assignedTo.username}</strong></span>}
                {viewingIssue.status && <span className="bv-badge bv-badge-lg">Status: <strong className="bv-badge-highlight bv-badge-no-bg">{viewingIssue.status.name}</strong></span>}
                {viewingIssue.priority && <span className="bv-badge bv-badge-lg">Priority: <strong>{viewingIssue.priority.name}</strong></span>}
                {viewingIssue.storyPoints !== null && <span className="bv-badge bv-badge-lg">Story Points: <strong>{viewingIssue.storyPoints}</strong></span>}
              </div>

              <div className="bv-modal-actions">
                <button className="bv-btn bv-cancel-btn" onClick={() => setViewingIssue(null)}>Close</button>
                <button className="bv-btn bv-save-btn" onClick={() => openIssueModal(viewingIssue)}>Edit Details</button>
              </div>
            </div>

            <div className="bv-view-right">
              <IssueComments issueId={viewingIssue.id} currentUserRole={currentUserRole} />
            </div>

          </div>
        </div>,
        document.body
      )}

      {/* ======================================================== */}
      {/* MODAL 2: EDIT/CREATE FORM                                  */}
      {/* ======================================================== */}
      {isModalOpen && createPortal(
        <div className="bv-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setIsModalOpen(false); }}>
          <div className="bv-modal-content">
            <h2 className="bv-modal-title">{editingIssueId ? 'Edit Issue' : 'Create New Issue'}</h2>
            
            <form className="bv-modal-form" onSubmit={handleSaveIssue}>
              <div className="bv-inputs-container">
                <div className="bv-text-input-container">
                  <div className="bv-form-group">
                    <label>Issue Title</label>
                    <input type="text" className="bv-modal-input" placeholder="e.g., Integrate Payment Gateway" value={formData.title} onChange={(e) => setFormData({...formData, title: e.target.value})} />
                    {formErrors.title && <span className="bv-form-error">{formErrors.title}</span>}
                  </div>
                  
                  <div className="bv-form-group">
                    <label>Description</label>
                    <textarea className="bv-modal-input" placeholder="Detailed description..." value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} />
                  </div>
                </div>
                <div className="bv-select-input-container">
                  <div className="bv-form-row">
                    <div className="bv-form-group">
                      <label>Issue Type</label>
                      <CustomDropdown 
                        currentValue={formData.typeId}
                        options={[
                          ...types.map(t => ({ value: t.id, label: t.name })),
                          // --- NEW: Add special item to the bottom of the list ---
                          { value: 'CREATE_NEW_TYPE', label: '+ Create New Type...' } 
                        ]}
                        onChange={(val) => {
                          if (val === 'CREATE_NEW_TYPE') {
                            setIsCreateTypeModalOpen(true);
                          } else {
                            setFormData({...formData, typeId: val});
                          }
                        }}
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
                    <label>Components</label>
                    <MultiSelectDropdown 
                      currentValues={formData.componentIds}
                      options={projectComponents.map(c => ({ value: c.id, label: c.name }))}
                      onChange={(values) => setFormData({...formData, componentIds: values})}
                      placeholder="Select components..."
                    />
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
                </div>
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

      {/* ======================================================== */}
      {/* MODAL 3: CREATE CUSTOM ISSUE TYPE MINI-MODAL               */}
      {/* ======================================================== */}
      {isCreateTypeModalOpen && createPortal(
        <div className="bv-modal-overlay bv-modal-overlay-top" onClick={(e) => { if (e.target === e.currentTarget) setIsCreateTypeModalOpen(false); }}>
          <div className="bv-modal-content bv-modal-sm">
            <h2 className="bv-modal-title">Create Issue Type</h2>
            
            <form className="bv-modal-form" onSubmit={handleCreateType}>
              <div className="bv-form-group">
                <label>Issue Type Name</label>
                <input 
                  type="text" 
                  className="bv-modal-input" 
                  placeholder="e.g., Epic, Design, Research" 
                  value={newTypeName} 
                  maxLength={50}
                  onChange={(e) => setNewTypeName(e.target.value)} 
                  autoFocus
                  required 
                />
              </div>

              <div className="bv-modal-actions">
                <button type="button" className="bv-btn bv-cancel-btn" onClick={() => setIsCreateTypeModalOpen(false)}>Cancel</button>
                <button type="submit" disabled={isCreatingType} className="bv-btn bv-save-btn">
                  {isCreatingType ? 'Creating...' : 'Create'}
                </button>
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