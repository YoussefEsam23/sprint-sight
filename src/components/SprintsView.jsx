import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { createPortal } from 'react-dom'; 
import '../styling/SprintsView.css';

const SprintsView = () => {
  const { projectId } = useParams(); 
  
  const [sprints, setSprints] = useState([]);
  const [allIssues, setAllIssues] = useState([]); 
  const [currentUserRole, setCurrentUserRole] = useState('VIEWER'); 
  const [isLoading, setIsLoading] = useState(true);
  
  // --- MODAL & MENU STATES ---
  const [openMenuId, setOpenMenuId] = useState(null);
  const [viewingSprint, setViewingSprint] = useState(null);
  const [editingSprintId, setEditingSprintId] = useState(null);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({ name: '', goal: '', startDate: '', endDate: '' });
  
  const [isAddStoryModalOpen, setIsAddStoryModalOpen] = useState(false);
  const [targetSprintId, setTargetSprintId] = useState(null);
  const [selectedIssueIds, setSelectedIssueIds] = useState([]);
  
  // --- START & CLOSE SPRINT STATES ---
  const [isStartModalOpen, setIsStartModalOpen] = useState(false);
  const [isCloseModalOpen, setIsCloseModalOpen] = useState(false);
  const [activeSprintData, setActiveSprintData] = useState(null);
  const [startDates, setStartDates] = useState({ startDate: '', endDate: '' });
  const [moveUnfinishedTo, setMoveUnfinishedTo] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);

  // --- SMART DATE FORMATTERS ---
  const getSprintStart = (s) => s.startDate || s.startedAt || s.startTime;
  const getSprintEnd = (s) => s.endDate || s.endedAt || s.endTime;

  const formatDisplayDate = (dateVal) => {
    if (!dateVal) return 'Not set';
    if (Array.isArray(dateVal)) return new Date(dateVal[0], dateVal[1] - 1, dateVal[2]).toLocaleDateString();
    if (typeof dateVal === 'string') {
      const parsed = new Date(dateVal);
      if (!isNaN(parsed)) return parsed.toLocaleDateString();
    }
    return String(dateVal);
  };

  const formatInputDate = (dateVal) => {
    if (!dateVal) return '';
    if (Array.isArray(dateVal)) return `${dateVal[0]}-${String(dateVal[1]).padStart(2, '0')}-${String(dateVal[2]).padStart(2, '0')}`;
    if (typeof dateVal === 'string') return dateVal.split('T')[0];
    return '';
  };

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
      if (issuesRes.ok) setAllIssues((await issuesRes.json()).data || []);

      const membersRes = await fetch(`/api/projects/${projectId}/members`, { headers });
      if (membersRes.ok) {
        const membersData = await membersRes.json();
        const storedUser = JSON.parse(localStorage.getItem('sprintSightUser')) || {};
        const myRecord = (membersData.data || []).find(m => m.member.id === storedUser.id);
        if (myRecord) setCurrentUserRole(myRecord.projectRole);
      }

      const sprintsSummaryRes = await fetch(`/api/projects/${projectId}/sprints`, { headers });
      if (sprintsSummaryRes.ok) {
        const summaries = (await sprintsSummaryRes.json()).data || [];
        const detailsPromises = summaries.map(s => 
          fetch(`/api/projects/${projectId}/sprints/${s.id}`, { headers }).then(res => res.json())
        );
        const detailsResults = await Promise.all(detailsPromises);
        // Only show PLANNING and ACTIVE sprints
        const activeAndPlanningSprints = detailsResults.map(res => res.data).filter(s => s.status !== 'COMPLETED');
        setSprints(activeAndPlanningSprints);
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

  const canManageSprints = ['CREATOR', 'SCRUM_MASTER'].includes(currentUserRole);

  // ==========================================
  // HELPER FUNCTIONS & UI TOGGLES
  // ==========================================
  
  // THE MISSING FUNCTION!
  const toggleIssueSelection = (issueId) => {
    setSelectedIssueIds(prev => prev.includes(issueId) ? prev.filter(id => id !== issueId) : [...prev, issueId]);
  };

  const openAddStoryModal = (sprintId) => { 
    setTargetSprintId(sprintId); 
    setSelectedIssueIds([]); 
    setIsAddStoryModalOpen(true); 
  };

  // ==========================================
  // API ACTIONS
  // ==========================================

  const handleSaveSprint = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const url = editingSprintId ? `/api/projects/${projectId}/sprints/${editingSprintId}` : `/api/projects/${projectId}/sprints`;
      const method = editingSprintId ? 'PUT' : 'POST';

      const payload = {
        name: formData.name,
        goal: formData.goal,
        startDate: formData.startDate ? new Date(formData.startDate).toISOString() : null,
        endDate: formData.endDate ? new Date(formData.endDate).toISOString() : null
      };

      const response = await fetch(url, { method, headers: getAuthHeaders(), body: JSON.stringify(payload) });
      if (response.ok) { await fetchSprintsData(); setIsModalOpen(false); }
      else { alert(`Failed to save sprint: ${(await response.json()).message}`); }
    } catch (error) { console.error(error); } 
    finally { setIsSubmitting(false); }
  };

  const handleDeleteSprint = async (e, sprintId) => {
    e.stopPropagation();
    if (!window.confirm("Are you sure you want to delete this sprint? This cannot be undone.")) return;
    try {
      const response = await fetch(`/api/projects/${projectId}/sprints/${sprintId}`, { method: 'DELETE', headers: getAuthHeaders() });
      if (response.ok) { setOpenMenuId(null); fetchSprintsData(); }
      else { alert((await response.json()).message || "Failed to delete sprint."); }
    } catch (error) { console.error(error); }
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
      await fetchSprintsData(); setIsAddStoryModalOpen(false);
    } catch (error) { alert("Error adding issues."); } 
    finally { setIsSubmitting(false); }
  };

  const handleRemoveStoryFromSprint = async (sprintId, issueId) => {
    if (!window.confirm("Remove this issue from the sprint?")) return;
    try {
      const response = await fetch(`/api/projects/${projectId}/sprints/${sprintId}/issues/${issueId}`, { method: 'DELETE', headers: getAuthHeaders() });
      if (response.ok) await fetchSprintsData();
    } catch (error) { console.error(error); }
  };

  // --- START SPRINT ---
  const handleStartSprint = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const payload = {
        startDate: new Date(startDates.startDate).toISOString(),
        endDate: new Date(startDates.endDate).toISOString()
      };
      const response = await fetch(`/api/projects/${projectId}/sprints/${activeSprintData.id}/start`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(payload)
      });
      if (response.ok) { await fetchSprintsData(); setIsStartModalOpen(false); }
      else { alert((await response.json()).message || "Failed to start sprint."); }
    } catch (error) { console.error(error); } 
    finally { setIsSubmitting(false); }
  };

  // --- COMPLETE SPRINT ---
  const handleCompleteSprint = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const payload = {
        moveUnfinishedToSprintId: moveUnfinishedTo === '' ? null : moveUnfinishedTo
      };
      const response = await fetch(`/api/projects/${projectId}/sprints/${activeSprintData.id}/close`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(payload)
      });
      if (response.ok) { await fetchSprintsData(); setIsCloseModalOpen(false); }
      else { alert((await response.json()).message || "Failed to close sprint."); }
    } catch (error) { console.error(error); } 
    finally { setIsSubmitting(false); }
  };

  // ==========================================
  // DATA PREPARATION FOR RENDER
  // ==========================================

  const assignedIssueIds = new Set();
  sprints.forEach(sprint => sprint.issues?.forEach(item => { if (!item.removedAt) assignedIssueIds.add(item.issue.id); }));
  const unassignedIssues = allIssues.filter(issue => !assignedIssueIds.has(issue.id));

  // Find other planning sprints for the Close Sprint dropdown
  const otherPlanningSprints = sprints.filter(s => s.status === 'PLANNING' && s.id !== activeSprintData?.id);

  return (
    <>
      <div className="content-left">
        <div className="page-header">
          <div><p className="page-subtitle">SPRINTS OVERVIEW</p><h1 className="page-title">Active Board</h1></div>
          <div className="header-actions">
            {canManageSprints && (
              <button className="new-story-btn" onClick={() => {
                setViewingSprint(null); setEditingSprintId(null);
                setFormData({ name: '', goal: '', startDate: '', endDate: '' });
                setIsModalOpen(true); setOpenMenuId(null);
              }}>+ CREATE SPRINT</button>
            )}
          </div>
        </div>

        {isLoading ? (
          <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}><h3>Loading sprints...</h3></div>
        ) : (
          <div className="sv-container">
            {sprints.map(sprint => {
              const activeSprintIssues = (sprint.issues || []).filter(item => !item.removedAt);
              const topPendingIssues = activeSprintIssues
                .filter(item => !item.issue.status?.isCompleted && item.issue.status?.name?.toLowerCase() !== 'done')
                .sort((a, b) => (b.issue.storyPoints || 0) - (a.issue.storyPoints || 0))
                .slice(0, 3);

              return (
                <div 
                  key={sprint.id} 
                  className="sv-sprint-card" 
                  style={{ zIndex: openMenuId === sprint.id ? 50 : 1, cursor: 'pointer', borderTop: sprint.status === 'ACTIVE' ? '4px solid var(--accent-color)' : '' }}
                  onClick={() => setViewingSprint(sprint)}
                >
                  <div className="sv-header">
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <h2 className="sv-title">{sprint.name}</h2>
                        {sprint.status === 'ACTIVE' && <span style={{ fontSize: '0.7rem', padding: '2px 8px', backgroundColor: 'rgba(16, 185, 129, 0.2)', color: '#10B981', borderRadius: '12px', fontWeight: 'bold' }}>ACTIVE</span>}
                        {sprint.status === 'PLANNING' && <span style={{ fontSize: '0.7rem', padding: '2px 8px', backgroundColor: 'var(--bg-hover)', color: 'var(--text-muted)', borderRadius: '12px', fontWeight: 'bold' }}>PLANNING</span>}
                      </div>
                      <p className="sv-dates">
                        {formatDisplayDate(getSprintStart(sprint))} &nbsp;→&nbsp; {formatDisplayDate(getSprintEnd(sprint))}
                      </p>
                      {sprint.goal && <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '6px' }}>Goal: {sprint.goal}</p>}
                    </div>
                    
                    <div className="sv-actions">
                     {/* Dynamic Action Button based on Status */}
                     {canManageSprints && sprint.status === 'PLANNING' && (
                       <button onClick={(e) => { e.stopPropagation(); setActiveSprintData(sprint); setStartDates({ startDate: formatInputDate(getSprintStart(sprint)), endDate: formatInputDate(getSprintEnd(sprint))}); setIsStartModalOpen(true); }} style={{ backgroundColor: '#10B981', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>▶ Start Sprint</button>
                     )}
                     {canManageSprints && sprint.status === 'ACTIVE' && (
                       <button onClick={(e) => { e.stopPropagation(); setActiveSprintData(sprint); setMoveUnfinishedTo(''); setIsCloseModalOpen(true); }} style={{ backgroundColor: '#3B82F6', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>🏁 Complete Sprint</button>
                     )}

                     {canManageSprints && (
                       <button onClick={(e) => { e.stopPropagation(); openAddStoryModal(sprint.id); }} className="sv-add-issues-btn">+ Add Issues</button>
                     )}
                     
                     <div className="menu-container">
                       <button className="options-btn" onClick={(e) => { e.stopPropagation(); setOpenMenuId(openMenuId === sprint.id ? null : sprint.id); }}>⋮</button>
                       {openMenuId === sprint.id && (
                         <div className="dropdown-menu sv-dropdown-menu">
                           <button className="dropdown-item" onClick={(e) => { e.stopPropagation(); setOpenMenuId(null); setViewingSprint(sprint); }}>👁️ View Details</button>
                           {canManageSprints && (
                             <>
                               <button className="dropdown-item" onClick={(e) => { e.stopPropagation(); setViewingSprint(null); setEditingSprintId(sprint.id); setFormData({ name: sprint.name || '', goal: sprint.goal || '', startDate: formatInputDate(getSprintStart(sprint)), endDate: formatInputDate(getSprintEnd(sprint)) }); setIsModalOpen(true); setOpenMenuId(null); }}>✏️ Edit Sprint</button>
                               <button className="dropdown-item" style={{color: '#e74c3c'}} onClick={(e) => handleDeleteSprint(e, sprint.id)}>🗑️ Delete Sprint</button>
                             </>
                           )}
                         </div>
                       )}
                     </div>
                    </div>
                  </div>

                  <div className="sv-body">
                    {activeSprintIssues.length === 0 ? (
                      <div className="sv-empty-text">Sprint is empty.</div>
                    ) : topPendingIssues.length > 0 ? (
                      <div className="sv-story-list">
                        {topPendingIssues.map(item => (
                          <div key={item.issue.id} className="sv-story-item">
                            <div>
                              <div className="sv-story-id" style={{ display: 'flex', alignItems: 'center', gap: '8px'}}>
                                <span style={{color: 'var(--accent-color)', textTransform: 'uppercase'}}>{item.issue.type?.name || 'Issue'}</span>
                                #{item.issue.id.substring(0, 6)}
                              </div>
                              <h3 className="sv-story-title">{item.issue.title}</h3>
                            </div>
                            {canManageSprints && <button onClick={(e) => { e.stopPropagation(); handleRemoveStoryFromSprint(sprint.id, item.issue.id); }} className="sv-remove-btn">✕ Remove</button>}
                          </div>
                        ))}
                        {activeSprintIssues.filter(item => !item.issue.status?.isCompleted && item.issue.status?.name?.toLowerCase() !== 'done').length > 3 && (
                          <div style={{ textAlign: 'center', fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '8px', fontStyle: 'italic' }}>+ View details to see more pending issues</div>
                        )}
                      </div>
                    ) : (
                      <div className="sv-empty-text" style={{ color: '#10B981', fontWeight: 'bold' }}>All active issues are marked as Done! 🎉</div>
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

      {/* ======================================================== */}
      {/* MODAL: VIEW SPRINT DETAILS                               */}
      {/* ======================================================== */}
      {viewingSprint && createPortal(
        <div className="sv-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setViewingSprint(null); }}>
          <div className="bv-view-modal">
            
            <div className="bv-view-left" style={{ display: 'flex', flexDirection: 'column', maxHeight: 'calc(90vh - 5rem)', overflowY: 'auto', paddingRight: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 'bold', color: 'var(--accent-color)', textTransform: 'uppercase' }}>Sprint Details</span>
              </div>
              <h2 style={{ margin: '0 0 1.5rem 0', fontSize: '1.8rem', color: 'var(--text-main)', lineHeight: '1.2' }}>{viewingSprint.name}</h2>
              <div style={{ marginBottom: '2rem' }}>
                <h4 style={{ color: 'var(--text-muted)', marginBottom: '0.5rem', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Goal</h4>
                <p style={{ color: 'var(--text-main)', lineHeight: '1.6', whiteSpace: 'pre-wrap', backgroundColor: 'var(--bg-main)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                  {viewingSprint.goal || <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>No goal provided.</span>}
                </p>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', marginBottom: '2rem' }}>
                <span style={{ fontSize: '0.9rem', padding: '6px 12px', backgroundColor: 'var(--bg-hover)', color: 'var(--text-main)', borderRadius: '12px' }}>Start: <strong>{formatDisplayDate(getSprintStart(viewingSprint))}</strong></span>
                <span style={{ fontSize: '0.9rem', padding: '6px 12px', backgroundColor: 'var(--bg-hover)', color: 'var(--text-main)', borderRadius: '12px' }}>End: <strong>{formatDisplayDate(getSprintEnd(viewingSprint))}</strong></span>
              </div>
              <div className="sv-modal-actions" style={{ marginTop: 'auto', paddingTop: '1.5rem', borderTop: 'none' }}>
                <button className="sv-btn sv-cancel-btn" onClick={() => setViewingSprint(null)}>Close</button>
              </div>
            </div>

            <div className="bv-view-right" style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', maxHeight: 'calc(90vh - 5rem)' }}>
              <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.1rem', color: 'var(--text-main)', flexShrink: 0 }}>Sprint Issues</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', paddingRight: '8px', overflowY: 'auto', flex: 1, minHeight: 0 }}>
                {(() => {
                  const activeSprintIssues = (viewingSprint.issues || []).filter(item => !item.removedAt);
                  if (activeSprintIssues.length === 0) return <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>No issues are currently assigned to this sprint.</p>;
                  return activeSprintIssues.map(item => (
                    <div key={item.issue.id} style={{ backgroundColor: 'var(--bg-card)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)', flexShrink: 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--accent-color)', textTransform: 'uppercase' }}>{item.issue.type?.name || 'Issue'}</span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>#{item.issue.id?.substring(0, 6)}</span>
                      </div>
                      <h4 style={{ margin: '0 0 8px 0', fontSize: '0.95rem', color: 'var(--text-main)' }}>{item.issue.title}</h4>
                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        {item.issue.status && <span style={{ fontSize: '0.75rem', padding: '2px 8px', backgroundColor: 'var(--bg-hover)', color: 'var(--text-main)', borderRadius: '12px' }}>{item.issue.status.name}</span>}
                        {item.issue.assignedTo && <span style={{ fontSize: '0.75rem', padding: '2px 8px', backgroundColor: 'var(--bg-hover)', color: 'var(--text-main)', borderRadius: '12px' }}>👤 {item.issue.assignedTo.username}</span>}
                      </div>
                    </div>
                  ));
                })()}
              </div>
            </div>

          </div>
        </div>,
        document.body
      )}

      {/* ======================================================== */}
      {/* MODAL: START SPRINT                                        */}
      {/* ======================================================== */}
      {isStartModalOpen && activeSprintData && createPortal(
        <div className="sv-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setIsStartModalOpen(false); }}>
          <div className="sv-modal-content">
            <h2 className="sv-modal-title">Start Sprint: {activeSprintData.name}</h2>
            <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
              Confirm the dates for this sprint. Once started, issues will be actively tracked.
            </p>
            <form className="sv-modal-form" onSubmit={handleStartSprint}>
              <div className="sv-form-row">
                <div className="sv-form-group"><label>Start Date</label><input type="date" className="sv-modal-input" value={startDates.startDate} onChange={(e) => setStartDates({...startDates, startDate: e.target.value})} required/></div>
                <div className="sv-form-group"><label>End Date</label><input type="date" className="sv-modal-input" value={startDates.endDate} onChange={(e) => setStartDates({...startDates, endDate: e.target.value})} required/></div>
              </div>
              <div className="sv-modal-actions">
                <button type="button" disabled={isSubmitting} className="sv-btn sv-cancel-btn" onClick={() => setIsStartModalOpen(false)}>Cancel</button>
                <button type="submit" disabled={isSubmitting} className="sv-btn sv-save-btn" style={{ backgroundColor: '#10B981' }}>{isSubmitting ? 'Starting...' : 'Start Sprint'}</button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* ======================================================== */}
      {/* MODAL: COMPLETE SPRINT                                     */}
      {/* ======================================================== */}
      {isCloseModalOpen && activeSprintData && createPortal(
        <div className="sv-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setIsCloseModalOpen(false); }}>
          <div className="sv-modal-content">
            <h2 className="sv-modal-title">Complete Sprint: {activeSprintData.name}</h2>
            
            {(() => {
              const activeIssues = (activeSprintData.issues || []).filter(item => !item.removedAt);
              const completedCount = activeIssues.filter(item => item.issue.status?.isCompleted || item.issue.status?.name?.toLowerCase() === 'done').length;
              const unfinishedCount = activeIssues.length - completedCount;

              return (
                <form className="sv-modal-form" onSubmit={handleCompleteSprint}>
                  <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
                    <div style={{ flex: 1, padding: '1rem', backgroundColor: 'rgba(16, 185, 129, 0.1)', border: '1px solid #10B981', borderRadius: '8px', textAlign: 'center' }}>
                      <h3 style={{ margin: 0, color: '#10B981', fontSize: '1.5rem' }}>{completedCount}</h3>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-main)' }}>Completed Issues</span>
                    </div>
                    <div style={{ flex: 1, padding: '1rem', backgroundColor: 'rgba(239, 68, 68, 0.1)', border: '1px solid #EF4444', borderRadius: '8px', textAlign: 'center' }}>
                      <h3 style={{ margin: 0, color: '#EF4444', fontSize: '1.5rem' }}>{unfinishedCount}</h3>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-main)' }}>Unfinished Issues</span>
                    </div>
                  </div>

                  {unfinishedCount > 0 && (
                    <div className="sv-form-group" style={{ marginBottom: '1rem' }}>
                      <label>Where should the {unfinishedCount} unfinished issues go?</label>
                      <select className="sv-modal-input" value={moveUnfinishedTo} onChange={(e) => setMoveUnfinishedTo(e.target.value)}>
                        <option value="">Move to Backlog</option>
                        {otherPlanningSprints.map(s => (
                          <option key={s.id} value={s.id}>Move to: {s.name}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div className="sv-modal-actions">
                    <button type="button" disabled={isSubmitting} className="sv-btn sv-cancel-btn" onClick={() => setIsCloseModalOpen(false)}>Cancel</button>
                    <button type="submit" disabled={isSubmitting} className="sv-btn sv-save-btn" style={{ backgroundColor: '#3B82F6' }}>{isSubmitting ? 'Completing...' : 'Complete Sprint'}</button>
                  </div>
                </form>
              );
            })()}
          </div>
        </div>,
        document.body
      )}

      {/* ======================================================== */}
      {/* MODAL: EDIT/CREATE                                         */}
      {/* ======================================================== */}
      {isModalOpen && canManageSprints && createPortal(
        <div className="sv-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setIsModalOpen(false); }}>
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

      {/* ======================================================== */}
      {/* MODAL: PULL ISSUES                                         */}
      {/* ======================================================== */}
      {isAddStoryModalOpen && canManageSprints && createPortal(
        <div className="sv-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setIsAddStoryModalOpen(false); }}>
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