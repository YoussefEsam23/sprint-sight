import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { createPortal } from 'react-dom'; 
import '../styling/SprintsView.css';

import CustomDropdown from './CustomDropdown';
import MultiSelectDropdown from './MultiSelectDropdown';
import IssueComments from './IssueComments';

const SprintsView = () => {
  const { projectId } = useParams(); 
  
  const [sprints, setSprints] = useState([]);
  const [allIssues, setAllIssues] = useState([]); 
  const [members, setMembers] = useState([]);
  const [types, setTypes] = useState([]);
  const [priorities, setPriorities] = useState([]);
  const [statuses, setStatuses] = useState([]);
  const [projectComponents, setProjectComponents] = useState([]);
  
  const [currentUserRole, setCurrentUserRole] = useState('VIEWER'); 
  const [isLoading, setIsLoading] = useState(true);
  const [openMenuId, setOpenMenuId] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [viewingSprint, setViewingSprint] = useState(null);
  const [editingSprintId, setEditingSprintId] = useState(null);
  const [isSprintModalOpen, setIsSprintModalOpen] = useState(false);
  const [sprintFormData, setSprintFormData] = useState({ name: '', goal: '', startDate: '', endDate: '' });
  
  const [isAddStoryModalOpen, setIsAddStoryModalOpen] = useState(false);
  const [targetSprintId, setTargetSprintId] = useState(null);
  const [selectedIssueIds, setSelectedIssueIds] = useState([]);
  const [expandedGroups, setExpandedGroups] = useState({}); 
  
  const [isStartModalOpen, setIsStartModalOpen] = useState(false);
  const [isCloseModalOpen, setIsCloseModalOpen] = useState(false);
  const [activeSprintData, setActiveSprintData] = useState(null);
  const [startDates, setStartDates] = useState({ startDate: '', endDate: '' });
  const [moveUnfinishedTo, setMoveUnfinishedTo] = useState('');

  // --- NEW AI PREDICTION STATES ---
  const [predictionData, setPredictionData] = useState(null);
  const [isPredicting, setIsPredicting] = useState(false);

  const [viewingIssue, setViewingIssue] = useState(null); 
  const [editingIssueId, setEditingIssueId] = useState(null);
  const [isIssueModalOpen, setIsIssueModalOpen] = useState(false); 
  const [formErrors, setFormErrors] = useState({});
  const [issueFormData, setIssueFormData] = useState({ 
    title: '', description: '', typeId: '', priorityId: '', statusId: '', storyPoints: '', assignedTo: '', componentIds: []
  });

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
      const [issuesRes, membersRes, sprintsRes, typesRes, prioritiesRes, statusesRes, componentsRes] = await Promise.all([
        fetch(`/api/projects/${projectId}/issues`, { headers }),
        fetch(`/api/projects/${projectId}/members`, { headers }),
        fetch(`/api/projects/${projectId}/sprints`, { headers }),
        fetch(`/api/projects/${projectId}/configurations/types`, { headers }),
        fetch(`/api/projects/${projectId}/configurations/priorities`, { headers }),
        fetch(`/api/projects/${projectId}/configurations/statuses`, { headers }),
        fetch(`/api/projects/${projectId}/components`, { headers })
      ]);

      if (issuesRes.ok) setAllIssues((await issuesRes.json()).data || []);
      
      if (membersRes.ok) {
        const membersData = await membersRes.json();
        setMembers(membersData.data || []);
        const storedUser = JSON.parse(localStorage.getItem('sprintSightUser')) || {};
        const myRecord = (membersData.data || []).find(m => m.member.id === storedUser.id);
        if (myRecord) setCurrentUserRole(myRecord.projectRole);
      }

      if (sprintsRes.ok) {
        const summaries = (await sprintsRes.json()).data || [];
        const detailsPromises = summaries.map(s => fetch(`/api/projects/${projectId}/sprints/${s.id}`, { headers }).then(res => res.json()));
        const detailsResults = await Promise.all(detailsPromises);
        const activeAndPlanningSprints = detailsResults.map(res => res.data).filter(s => s.status !== 'COMPLETED');
        setSprints(activeAndPlanningSprints);
      }

      if (typesRes.ok) setTypes((await typesRes.json()).data || []);
      if (prioritiesRes.ok) setPriorities((await prioritiesRes.json()).data || []);
      if (statusesRes.ok) setStatuses((await statusesRes.json()).data || []);
      if (componentsRes.ok) setProjectComponents((await componentsRes.json()).data || []);

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

  useEffect(() => {
    if (viewingSprint) {
      const updatedSprint = sprints.find(s => s.id === viewingSprint.id);
      if (updatedSprint) setViewingSprint(updatedSprint);
    } else {
      // Clear AI prediction data when closing the modal
      setPredictionData(null);
    }
  }, [sprints, viewingSprint]);

  useEffect(() => {
    if (viewingIssue) {
      const updatedIssue = allIssues.find(i => i.id === viewingIssue.id);
      if (updatedIssue) setViewingIssue(updatedIssue);
    }
  }, [allIssues]);

  const canManageSprints = ['CREATOR', 'SCRUM_MASTER'].includes(currentUserRole);

  const handleSaveSprint = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const url = editingSprintId ? `/api/projects/${projectId}/sprints/${editingSprintId}` : `/api/projects/${projectId}/sprints`;
      const method = editingSprintId ? 'PUT' : 'POST';
      const todayStr = new Date().toISOString().split('T')[0];

      const payload = {
        name: sprintFormData.name, goal: sprintFormData.goal,
        startDate: sprintFormData.startDate || todayStr,
        endDate: sprintFormData.endDate || null
      };

      const response = await fetch(url, { method, headers: getAuthHeaders(), body: JSON.stringify(payload) });
      if (response.ok) { await fetchSprintsData(); setIsSprintModalOpen(false); }
      else { alert(`Failed to save sprint: ${(await response.json()).message}`); }
    } catch (error) { console.error(error); } finally { setIsSubmitting(false); }
  };

  const handleDeleteSprint = async (e, sprintId) => {
    e.stopPropagation();
    if (!window.confirm("Are you sure you want to delete this sprint? This cannot be undone.")) return;
    try {
      const response = await fetch(`/api/projects/${projectId}/sprints/${sprintId}`, { method: 'DELETE', headers: getAuthHeaders() });
      if (response.ok) { setOpenMenuId(null); fetchSprintsData(); }
    } catch (error) { console.error(error); }
  };

  const handleStartSprint = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const todayStr = new Date().toISOString().split('T')[0];
      const payload = { 
        startDate: startDates.startDate || todayStr, 
        endDate: startDates.endDate || null 
      };
      const response = await fetch(`/api/projects/${projectId}/sprints/${activeSprintData.id}/start`, { method: 'POST', headers: getAuthHeaders(), body: JSON.stringify(payload) });
      if (response.ok) { await fetchSprintsData(); setIsStartModalOpen(false); }
      else { alert(`Failed to start sprint: ${(await response.json()).message}`); }
    } catch (error) { console.error(error); } finally { setIsSubmitting(false); }
  };

  const handleCompleteSprint = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const payload = { moveUnfinishedToSprintId: moveUnfinishedTo === '' ? null : moveUnfinishedTo };
      
      if (!activeSprintData.endDate) {
        payload.endDate = new Date().toISOString().split('T')[0];
      }

      const response = await fetch(`/api/projects/${projectId}/sprints/${activeSprintData.id}/close`, { method: 'POST', headers: getAuthHeaders(), body: JSON.stringify(payload) });
      if (response.ok) { await fetchSprintsData(); setIsCloseModalOpen(false); }
      else { alert(`Failed to close sprint: ${(await response.json()).message}`); }
    } catch (error) { console.error(error); } finally { setIsSubmitting(false); }
  };

  // --- NEW AI PREDICTION FUNCTION ---
  const handleGetPrediction = async (sprintId) => {
    setIsPredicting(true);
    try {
      const response = await fetch(`/api/projects/${projectId}/sprints/${sprintId}/prediction`, {
        headers: getAuthHeaders()
      });
      if (response.ok) {
        const result = await response.json();
        setPredictionData(result.data);
      } else {
        alert("Failed to fetch AI prediction. Ensure the backend AI service is running.");
      }
    } catch (error) {
      console.error("AI Prediction Error:", error);
    } finally {
      setIsPredicting(false);
    }
  };

  const handleSaveAssignedStories = async (e) => {
    e.preventDefault();
    if (selectedIssueIds.length === 0) return setIsAddStoryModalOpen(false);
    setIsSubmitting(true);
    try {
      const promises = selectedIssueIds.map(issueId => fetch(`/api/projects/${projectId}/sprints/${targetSprintId}/issues/${issueId}`, { method: 'POST', headers: getAuthHeaders() }));
      await Promise.all(promises);
      await fetchSprintsData(); setIsAddStoryModalOpen(false);
    } catch (error) { alert("Error adding issues."); } finally { setIsSubmitting(false); }
  };

  const handleRemoveStoryFromSprint = async (sprintId, issueId) => {
    if (!window.confirm("Remove this issue from the sprint?")) return;
    try {
      const response = await fetch(`/api/projects/${projectId}/sprints/${sprintId}/issues/${issueId}`, { method: 'DELETE', headers: getAuthHeaders() });
      if (response.ok) {
        await fetchSprintsData();
        setViewingIssue(null); 
      }
    } catch (error) { console.error(error); }
  };

  const toggleIssueSelection = (issueId) => { setSelectedIssueIds(prev => prev.includes(issueId) ? prev.filter(id => id !== issueId) : [...prev, issueId]); };
  
  const openAddStoryModal = (sprintId) => { 
    setTargetSprintId(sprintId); 
    setSelectedIssueIds([]); 
    setExpandedGroups({}); 
    setIsAddStoryModalOpen(true); 
  };
  
  const toggleGroup = (groupId) => {
    setExpandedGroups(prev => ({ ...prev, [groupId]: !prev[groupId] }));
  };

  const openIssueModal = (issue = null) => {
    if (issue) {
      setEditingIssueId(issue.id);
      setIssueFormData({ 
        title: issue.title || '', description: issue.description || '', 
        typeId: issue.type?.id || types[0]?.id || '', priorityId: issue.priority?.id || priorities[0]?.id || '', 
        statusId: issue.status?.id || statuses[0]?.id || '', storyPoints: issue.storyPoints || '', 
        assignedTo: issue.assignedTo?.id || '', componentIds: issue.components ? issue.components.map(c => c.id) : []
      });
    } else {
      setEditingIssueId(null);
      setIssueFormData({ title: '', description: '', typeId: types[0]?.id || '', priorityId: priorities[0]?.id || '', statusId: statuses[0]?.id || '', storyPoints: '', assignedTo: '', componentIds: [] });
    }
    setFormErrors({}); 
    setIsIssueModalOpen(true); 
  };

  const handleSaveIssue = async (e) => {
    e.preventDefault();
    if (!issueFormData.title.trim()) { setFormErrors({title: "Title is required."}); return; }

    const payload = {
      title: issueFormData.title, description: issueFormData.description || null,
      typeId: issueFormData.typeId, priorityId: issueFormData.priorityId,
      storyPoints: issueFormData.storyPoints ? parseInt(issueFormData.storyPoints) : null,
      assignedTo: issueFormData.assignedTo || null, componentIds: issueFormData.componentIds
    };
    if (editingIssueId && issueFormData.statusId) payload.statusId = issueFormData.statusId;

    try {
      setIsSubmitting(true);
      const url = editingIssueId ? `/api/projects/${projectId}/issues/${editingIssueId}` : `/api/projects/${projectId}/issues`;
      const response = await fetch(url, { method: editingIssueId ? 'PATCH' : 'POST', headers: getAuthHeaders(), body: JSON.stringify(payload) });

      if (response.ok) {
        await fetchSprintsData(); 
        setIsIssueModalOpen(false);
      } else {
        alert(`Failed to save issue: ${(await response.json()).message}`);
      }
    } catch (error) { console.error("Error saving issue:", error); } finally { setIsSubmitting(false); }
  };

  const handleDeleteIssue = async (e, id) => {
    e.stopPropagation();
    if (!window.confirm("Are you sure you want to delete this issue globally?")) return;
    try {
      const response = await fetch(`/api/projects/${projectId}/issues/${id}`, { method: 'DELETE', headers: getAuthHeaders() });
      if (response.ok) { 
        setViewingIssue(null); 
        setIsIssueModalOpen(false);
        fetchSprintsData(); 
      }
    } catch (error) { console.error("Error deleting issue:", error); }
  };

  const assignedIssueIds = new Set();
  sprints.forEach(sprint => sprint.issues?.forEach(item => { if (!item.removedAt) assignedIssueIds.add(item.issue.id); }));
  const unassignedIssues = allIssues.filter(issue => !assignedIssueIds.has(issue.id));
  const otherPlanningSprints = sprints.filter(s => s.status === 'PLANNING' && s.id !== activeSprintData?.id);

  const issuesByComponent = {};
  unassignedIssues.forEach(issue => {
    if (!issue.components || issue.components.length === 0) {
      if (!issuesByComponent['none']) issuesByComponent['none'] = { id: 'none', name: 'No Component Assigned', issues: [] };
      issuesByComponent['none'].issues.push(issue);
    } else {
      issue.components.forEach(comp => {
        if (!issuesByComponent[comp.id]) issuesByComponent[comp.id] = { id: comp.id, name: comp.name, issues: [] };
        issuesByComponent[comp.id].issues.push(issue);
      });
    }
  });

  const groupedIssuesArray = Object.values(issuesByComponent).sort((a, b) => {
    if (a.id === 'none') return 1; 
    if (b.id === 'none') return -1;
    return a.name.localeCompare(b.name);
  });

  return (
    <>
      <div className="content-left">
        <div className="page-header">
          <div><p className="page-subtitle">SPRINTS OVERVIEW</p><h1 className="page-title">Active Board</h1></div>
          <div className="header-actions">
            {canManageSprints && (
              <button className="new-story-btn" onClick={() => {
                setViewingSprint(null); setEditingSprintId(null);
                setSprintFormData({ name: '', goal: '', startDate: '', endDate: '' });
                setIsSprintModalOpen(true); setOpenMenuId(null);
              }}>+ CREATE SPRINT</button>
            )}
          </div>
        </div>

        {isLoading ? (
          <div className="sv-loading-state"><h3>Loading sprints...</h3></div>
        ) : (
          <div className="sv-container">
            {sprints.map(sprint => {
              const activeSprintIssues = (sprint.issues || []).filter(item => !item.removedAt);
              const completedIssuesCount = activeSprintIssues.filter(i => i.issue.status?.isCompleted || i.issue.status?.name?.toLowerCase() === 'done').length;
              const pendingIssuesCount = activeSprintIssues.length - completedIssuesCount;

              return (
                <div 
                  key={sprint.id} 
                  className={`sv-sprint-card ${sprint.status === 'ACTIVE' ? 'sv-active-sprint' : ''}`}
                  style={{ zIndex: openMenuId === sprint.id ? 50 : 1 }}
                  onClick={() => setViewingSprint(sprint)}
                >
                  <div className="sv-header sv-header-no-border">
                    <div>
                      <div className="sv-title-wrapper">
                        <h2 className="sv-title">{sprint.name}</h2>
                        {sprint.status === 'ACTIVE' && <span className="sv-status-badge sv-status-active">ACTIVE</span>}
                        {sprint.status === 'PLANNING' && <span className="sv-status-badge sv-status-planning">PLANNING</span>}
                      </div>
                      <p className="sv-dates">
                        {formatDisplayDate(getSprintStart(sprint))} &nbsp;→&nbsp; {formatDisplayDate(getSprintEnd(sprint))}
                      </p>
                      {sprint.goal && <p className="sv-goal-text">Goal: {sprint.goal}</p>}
                    </div>
                    
                    <div className="sv-actions">
                     {canManageSprints && sprint.status === 'PLANNING' && (
                       <button onClick={(e) => { e.stopPropagation(); setActiveSprintData(sprint); setStartDates({ startDate: formatInputDate(getSprintStart(sprint)), endDate: formatInputDate(getSprintEnd(sprint))}); setIsStartModalOpen(true); }} className="sv-btn-start">▶ Start Sprint</button>
                     )}
                     {canManageSprints && sprint.status === 'ACTIVE' && (
                       <button onClick={(e) => { e.stopPropagation(); setActiveSprintData(sprint); setMoveUnfinishedTo(''); setIsCloseModalOpen(true); }} className="sv-btn-complete">🏁 Complete Sprint</button>
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
                               <button className="dropdown-item" onClick={(e) => { e.stopPropagation(); setViewingSprint(null); setEditingSprintId(sprint.id); setSprintFormData({ name: sprint.name || '', goal: sprint.goal || '', startDate: formatInputDate(getSprintStart(sprint)), endDate: formatInputDate(getSprintEnd(sprint)) }); setIsSprintModalOpen(true); setOpenMenuId(null); }}>✏️ Edit Sprint</button>
                               <button className="dropdown-item sv-text-danger" onClick={(e) => handleDeleteSprint(e, sprint.id)}>🗑️ Delete Sprint</button>
                             </>
                           )}
                         </div>
                       )}
                     </div>
                    </div>
                  </div>

                  <div className="sv-body sv-metrics-summary">
                    {activeSprintIssues.length === 0 ? (
                      <span className="sv-empty-metrics">Sprint is empty. Add issues to begin.</span>
                    ) : (
                      <>
                        <div className="sv-metric-item">
                          <span className="sv-metric-value">{activeSprintIssues.length}</span>
                          <span className="sv-metric-label">Total Issues</span>
                        </div>
                        <div className="sv-metric-divider"></div>
                        <div className="sv-metric-item">
                          <span className="sv-metric-value sv-metric-success">{completedIssuesCount}</span>
                          <span className="sv-metric-label">Completed</span>
                        </div>
                        <div className="sv-metric-divider"></div>
                        <div className="sv-metric-item">
                          <span className="sv-metric-value sv-metric-danger">{pendingIssuesCount}</span>
                          <span className="sv-metric-label">Pending</span>
                        </div>
                      </>
                    )}
                  </div>

                </div>
              );
            })}

            {sprints.length === 0 && (
              <div className="sv-empty-board">
                <h3 className="sv-empty-board-title">No sprints found</h3>
                <p className="sv-empty-board-text">{canManageSprints ? "Create a sprint to start organizing your active issues." : "Waiting for the Scrum Master to create a sprint."}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ======================================================== */}
      {/* MODAL 1: VIEW SPRINT DETAILS (WITH AI INTEGRATION)         */}
      {/* ======================================================== */}
      {viewingSprint && createPortal(
        <div className="sv-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setViewingSprint(null); }}>
          <div className="bv-view-modal">
            
            <div className="bv-view-left sv-modal-left">
              <div className="sv-modal-meta-header">
                <span className="sv-modal-meta-label">Sprint Details</span>
              </div>
              <h2 className="sv-modal-title-text">{viewingSprint.name}</h2>
              <div className="sv-modal-section">
                <h4 className="sv-modal-section-title">Goal</h4>
                <p className="sv-modal-goal-text">
                  {viewingSprint.goal || <span style={{ fontStyle: 'italic' }}>No goal provided.</span>}
                </p>
              </div>
              <div className="sv-modal-dates-row">
                <span className="sv-modal-date-badge">Start: <strong>{formatDisplayDate(getSprintStart(viewingSprint))}</strong></span>
                <span className="sv-modal-date-badge">End: <strong>{formatDisplayDate(getSprintEnd(viewingSprint))}</strong></span>
              </div>

              {/* --- NEW ✨ AI INSIGHTS SECTION --- */}
              <div className="sv-modal-section">
                <h4 className="sv-modal-section-title">✨ AI Insights</h4>
                
                {!predictionData ? (
                  <button 
                    className="sv-btn-ai" 
                    onClick={() => handleGetPrediction(viewingSprint.id)} 
                    disabled={isPredicting}
                  >
                    {isPredicting ? '🧠 Analyzing Sprint Data...' : 'Predict Sprint Outcome'}
                  </button>
                ) : (
                  <div className="sv-ai-card">
                    <div className="sv-ai-metric">
                      <span className="sv-ai-label">Predicted Productivity</span>
                      <div className="sv-ai-bar-bg">
                        <div className="sv-ai-bar-fill" style={{ width: `${predictionData.productivity}%` }}></div>
                      </div>
                      <span className="sv-ai-value">{predictionData.productivityLabel} ({predictionData.productivity.toFixed(1)}%)</span>
                    </div>

                    <div className="sv-ai-metric">
                      <span className="sv-ai-label">Predicted Quality</span>
                      <div className="sv-ai-bar-bg">
                        <div className="sv-ai-bar-fill" style={{ width: `${predictionData.quality}%` }}></div>
                      </div>
                      <span className="sv-ai-value">{predictionData.qualityLabel} ({predictionData.quality.toFixed(1)}%)</span>
                    </div>
                  </div>
                )}
              </div>

              <div className="sv-modal-actions sv-view-actions">
                <button className="sv-btn sv-cancel-btn" onClick={() => setViewingSprint(null)}>Close</button>
              </div>
            </div>

            <div className="bv-view-right sv-modal-right">
              <h3 className="sv-modal-right-title">Sprint Issues</h3>
              <div className="sv-modal-issues-list">
                {(() => {
                  const activeSprintIssues = (viewingSprint.issues || []).filter(item => !item.removedAt);
                  if (activeSprintIssues.length === 0) return <p className="sv-modal-empty-issues">No issues are currently assigned to this sprint.</p>;
                  return activeSprintIssues.map(item => (
                    
                    <div 
                      key={item.issue.id} 
                      className="sv-issue-card"
                      onClick={() => setViewingIssue(item.issue)} 
                    >
                      <div className="sv-issue-card-header">
                        <div>
                          <span className="sv-issue-card-type">{item.issue.type?.name || 'Issue'}</span>
                          <span className="sv-issue-card-id">#{item.issue.id?.substring(0, 6)}</span>
                        </div>
                        {canManageSprints && (
                          <button 
                            onClick={(e) => { e.stopPropagation(); handleRemoveStoryFromSprint(viewingSprint.id, item.issue.id); }} 
                            className="sv-remove-btn" title="Remove from Sprint"
                          >
                            ✕
                          </button>
                        )}
                      </div>
                      <h4 className="sv-issue-card-title">{item.issue.title}</h4>
                      <div className="sv-issue-card-badges">
                        {item.issue.status && <span className="sv-issue-badge">{item.issue.status.name}</span>}
                        {item.issue.assignedTo && <span className="sv-issue-badge">👤 {item.issue.assignedTo.username}</span>}
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
      {/* MODAL 2: VIEW ISSUE DETAILS                                */}
      {/* ======================================================== */}
      {viewingIssue && createPortal(
        <div className="bv-modal-overlay sv-modal-overlay-top" onClick={(e) => { if (e.target === e.currentTarget) setViewingIssue(null); }}>
          <div className="bv-view-modal">
            
            <div className="bv-view-left">
              <div className="sv-modal-meta-header">
                <span className="sv-modal-meta-label">
                  {viewingIssue.type?.name || 'Issue'}
                </span>
              </div>
              
              <h2 className="sv-modal-title-text">{viewingIssue.title}</h2>
              
              <div className="sv-modal-section">
                <h4 className="sv-modal-section-title">Description</h4>
                <p className="sv-modal-goal-text">
                  {viewingIssue.description || <span style={{ fontStyle: 'italic' }}>No description provided.</span>}
                </p>
              </div>

              <div className="sv-modal-dates-row">
                {viewingIssue.components && viewingIssue.components.length > 0 && (
                  <span className="bv-badge sv-badge-components">
                    🧩 {viewingIssue.components.map(c => c.name).join(', ')}
                  </span>
                )}
                {viewingIssue.assignedTo && <span className="bv-badge sv-badge-lg">👤 Assignee: <strong>{viewingIssue.assignedTo.fullName || viewingIssue.assignedTo.username}</strong></span>}
                {viewingIssue.status && <span className="bv-badge sv-badge-lg">Status: <strong className="bv-badge-highlight sv-badge-no-bg">{viewingIssue.status.name}</strong></span>}
                {viewingIssue.priority && <span className="bv-badge sv-badge-lg">Priority: <strong>{viewingIssue.priority.name}</strong></span>}
                {viewingIssue.storyPoints !== null && <span className="bv-badge sv-badge-lg">Story Points: <strong>{viewingIssue.storyPoints}</strong></span>}
              </div>

              <div className="bv-modal-actions sv-view-actions-top">
                {canManageSprints && (
                  <div style={{ display: 'flex', marginRight: 'auto' }}>
                    <button 
                      className="bv-btn sv-btn-remove-sprint" 
                      onClick={(e) => { e.stopPropagation(); handleRemoveStoryFromSprint(viewingSprint.id, viewingIssue.id); }}
                    >
                      Remove from Sprint
                    </button>
                    <button 
                      className="bv-btn sv-btn-delete-left" 
                      style={{ marginRight: 0 }} 
                      onClick={(e) => handleDeleteIssue(e, viewingIssue.id)}
                    >
                      Delete Global Issue
                    </button>
                  </div>
                )}
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
      {/* MODAL 3: EDIT ISSUE FORM                                   */}
      {/* ======================================================== */}
      {isIssueModalOpen && createPortal(
        <div className="bv-modal-overlay sv-modal-overlay-top" onClick={(e) => { if (e.target === e.currentTarget) setIsIssueModalOpen(false); }}>
          <div className="bv-modal-content">
            <h2 className="bv-modal-title">{editingIssueId ? 'Edit Issue' : 'Create New Issue'}</h2>
            
            <form className="bv-modal-form" onSubmit={handleSaveIssue}>
              <div className="bv-inputs-container">
                <div className="bv-text-input-container">
                  <div className="bv-form-group">
                    <label>Issue Title</label>
                    <input type="text" className="bv-modal-input" placeholder="e.g., Integrate Payment Gateway" value={issueFormData.title} onChange={(e) => setIssueFormData({...issueFormData, title: e.target.value})} />
                    {formErrors.title && <span className="bv-form-error">{formErrors.title}</span>}
                  </div>
                  
                  <div className="bv-form-group">
                    <label>Description</label>
                    <textarea className="bv-modal-input" placeholder="Detailed description..." value={issueFormData.description} onChange={(e) => setIssueFormData({...issueFormData, description: e.target.value})} />
                  </div>
                </div>
                <div className="bv-select-input-container">
                  <div className="bv-form-row">
                    <div className="bv-form-group">
                      <label>Issue Type</label>
                      <CustomDropdown 
                        currentValue={issueFormData.typeId}
                        options={types.map(t => ({ value: t.id, label: t.name }))}
                        onChange={(val) => setIssueFormData({...issueFormData, typeId: val})}
                      />
                      {formErrors.typeId && <span className="bv-form-error">{formErrors.typeId}</span>}
                    </div>

                    <div className="bv-form-group">
                      <label>Priority</label>
                      <CustomDropdown 
                        currentValue={issueFormData.priorityId}
                        options={priorities.map(p => ({ value: p.id, label: p.name }))}
                        onChange={(val) => setIssueFormData({...issueFormData, priorityId: val})}
                      />
                      {formErrors.priorityId && <span className="bv-form-error">{formErrors.priorityId}</span>}
                    </div>
                  </div>

                  <div className="bv-form-row">
                    <div className="bv-form-group">
                      <label>Status</label>
                      <CustomDropdown 
                        currentValue={issueFormData.statusId}
                        options={statuses.map(s => ({ value: s.id, label: s.name }))}
                        onChange={(val) => setIssueFormData({...issueFormData, statusId: val})}
                      />
                    </div>

                    <div className="bv-form-group">
                      <label>Story Points</label>
                      <input type="number" min="0" max="100" className="bv-modal-input" placeholder="e.g. 5" value={issueFormData.storyPoints} onChange={(e) => setIssueFormData({...issueFormData, storyPoints: e.target.value})} />
                    </div>
                  </div>

                  <div className="bv-form-group">
                    <label>Components</label>
                    <MultiSelectDropdown 
                      currentValues={issueFormData.componentIds}
                      options={projectComponents.map(c => ({ value: c.id, label: c.name }))}
                      onChange={(values) => setIssueFormData({...issueFormData, componentIds: values})}
                      placeholder="Select components..."
                    />
                  </div>

                  <div className="bv-form-group">
                    <label>Assign To</label>
                    <CustomDropdown 
                      currentValue={issueFormData.assignedTo}
                      options={[
                        { value: '', label: 'Unassigned' },
                        ...members.map(m => ({ 
                          value: m.member.id, 
                          label: `${m.member.fullName || m.member.username} (@${m.member.username})` 
                        }))
                      ]}
                      onChange={(val) => setIssueFormData({...issueFormData, assignedTo: val})}
                    />
                  </div>
                </div>
                </div>
              <div className="bv-modal-actions">
                <button type="button" disabled={isSubmitting} className="bv-btn bv-cancel-btn" onClick={() => setIsIssueModalOpen(false)}>Cancel</button>
                {editingIssueId && canManageSprints && (
                  <button type="button" disabled={isSubmitting} className="bv-btn sv-btn-delete-left" onClick={(e) => handleDeleteIssue(e, editingIssueId)}>Delete Global Issue</button>
                )}
                <button type="submit" disabled={isSubmitting} className="bv-btn bv-save-btn">{isSubmitting ? 'Saving...' : 'Save Changes'}</button>
              </div>
            </form>

          </div>
        </div>,
        document.body 
      )}

      {/* ======================================================== */}
      {/* MODAL 4: START SPRINT                                      */}
      {/* ======================================================== */}
      {isStartModalOpen && activeSprintData && createPortal(
        <div className="sv-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setIsStartModalOpen(false); }}>
          <div className="sv-modal-content">
            <h2 className="sv-modal-title">Start Sprint: {activeSprintData.name}</h2>
            <p className="sv-modal-desc">
              Confirm the dates for this sprint. Once started, issues will be actively tracked.
            </p>
            <form className="sv-modal-form" onSubmit={handleStartSprint}>
              <div className="sv-form-row">
                <div className="sv-form-group"><label>Start Date</label><input type="date" className="sv-modal-input" value={startDates.startDate} onChange={(e) => setStartDates({...startDates, startDate: e.target.value})} required/></div>
                <div className="sv-form-group"><label>End Date</label><input type="date" className="sv-modal-input" value={startDates.endDate} onChange={(e) => setStartDates({...startDates, endDate: e.target.value})} required/></div>
              </div>
              <div className="sv-modal-actions">
                <button type="button" disabled={isSubmitting} className="sv-btn sv-cancel-btn" onClick={() => setIsStartModalOpen(false)}>Cancel</button>
                <button type="submit" disabled={isSubmitting} className="sv-btn sv-save-btn sv-btn-save-start">{isSubmitting ? 'Starting...' : 'Start Sprint'}</button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* ======================================================== */}
      {/* MODAL 5: COMPLETE SPRINT                                   */}
      {/* ======================================================== */}
      {isCloseModalOpen && activeSprintData && createPortal(
        <div className="sv-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setIsCloseModalOpen(false); }}>
          <div className="sv-modal-content">
            <h2 className="sv-modal-title">Complete Sprint: {activeSprintData.name}</h2>
            
            {(() => {
              const activeIssues = (activeSprintData.issues || []).filter(item => !item.removedAt);
              const completedCount = activeIssues.filter(item => item.issue.status?.isCompleted || item.issue.status?.name?.toLowerCase() === 'done').length;
              const unfinishedCount = activeIssues.length - completedCount;

              const dropdownOptions = [
                { value: '', label: 'Move to Backlog' },
                ...otherPlanningSprints.map(s => ({ value: s.id, label: `Move to: ${s.name}` }))
              ];

              return (
                <form className="sv-modal-form" onSubmit={handleCompleteSprint}>
                  <div className="sv-complete-metrics-row">
                    <div className="sv-complete-metric-box sv-metric-success-box">
                      <h3 className="sv-complete-metric-value sv-metric-success-text">{completedCount}</h3>
                      <span className="sv-complete-metric-label">Completed Issues</span>
                    </div>
                    <div className="sv-complete-metric-box sv-metric-danger-box">
                      <h3 className="sv-complete-metric-value sv-metric-danger-text">{unfinishedCount}</h3>
                      <span className="sv-complete-metric-label">Unfinished Issues</span>
                    </div>
                  </div>

                  {unfinishedCount > 0 && (
                    <div className="sv-form-group sv-mb-1">
                      <label>Where should the {unfinishedCount} unfinished issues go?</label>
                      <CustomDropdown 
                        currentValue={moveUnfinishedTo}
                        options={dropdownOptions}
                        onChange={(val) => setMoveUnfinishedTo(val)}
                      />
                    </div>
                  )}

                  <div className="sv-modal-actions">
                    <button type="button" disabled={isSubmitting} className="sv-btn sv-cancel-btn" onClick={() => setIsCloseModalOpen(false)}>Cancel</button>
                    <button type="submit" disabled={isSubmitting} className="sv-btn sv-save-btn sv-btn-save-complete">{isSubmitting ? 'Completing...' : 'Complete Sprint'}</button>
                  </div>
                </form>
              );
            })()}
          </div>
        </div>,
        document.body
      )}

      {/* ======================================================== */}
      {/* MODAL 6: CREATE/EDIT SPRINT FORM                           */}
      {/* ======================================================== */}
      {isSprintModalOpen && canManageSprints && createPortal(
        <div className="sv-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setIsSprintModalOpen(false); }}>
          <div className="sv-modal-content">
            <h2 className="sv-modal-title">{editingSprintId ? 'Edit Sprint' : 'Create New Sprint'}</h2>
            <form className="sv-modal-form" onSubmit={handleSaveSprint}>
              <div className="sv-form-group">
                <label>Sprint Name</label>
                <input type="text" className="sv-modal-input" placeholder="e.g. Sprint 1" value={sprintFormData.name} onChange={(e) => setSprintFormData({...sprintFormData, name: e.target.value})} required/>
              </div>
              <div className="sv-form-group">
                <label>Sprint Goal (Optional)</label>
                <textarea className="sv-modal-input sv-textarea-sm" placeholder="What is the main objective of this sprint?" value={sprintFormData.goal} onChange={(e) => setSprintFormData({...sprintFormData, goal: e.target.value})} />
              </div>
              <div className="sv-form-row">
                <div className="sv-form-group"><label>Start Date</label><input type="date" className="sv-modal-input" value={sprintFormData.startDate} onChange={(e) => setSprintFormData({...sprintFormData, startDate: e.target.value})} required/></div>
                <div className="sv-form-group"><label>End Date</label><input type="date" className="sv-modal-input" value={sprintFormData.endDate} onChange={(e) => setSprintFormData({...sprintFormData, endDate: e.target.value})} required/></div>
              </div>
              <div className="sv-modal-actions">
                <button type="button" disabled={isSubmitting} className="sv-btn sv-cancel-btn" onClick={() => setIsSprintModalOpen(false)}>Cancel</button>
                <button type="submit" disabled={isSubmitting} className="sv-btn sv-save-btn">{isSubmitting ? 'Saving...' : 'Save Sprint'}</button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* ======================================================== */}
      {/* MODAL 7: PULL ISSUES FORM (GROUPED BY COMPONENT)           */}
      {/* ======================================================== */}
      {isAddStoryModalOpen && canManageSprints && createPortal(
        <div className="sv-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setIsAddStoryModalOpen(false); }}>
          <div className="sv-modal-content sv-modal-lg">
            <h2 className="sv-modal-title">Pull Issues from Backlog</h2>
            <form className="sv-modal-form" onSubmit={handleSaveAssignedStories}>
              <div className="sv-pull-list">
                {groupedIssuesArray.length > 0 ? (
                  groupedIssuesArray.map(group => (
                    <div key={group.id} className="sv-issue-group">
                      <div className="sv-group-header" onClick={() => toggleGroup(group.id)}>
                        <span>
                          {group.id === 'none' ? '📋' : '📁'} {group.name} 
                          <span style={{color: 'var(--text-muted)', fontSize: '0.8rem', marginLeft: '6px'}}>({group.issues.length})</span>
                        </span>
                        <span>{expandedGroups[group.id] ? '▼' : '▶'}</span>
                      </div>
                      
                      {expandedGroups[group.id] && (
                        <div className="sv-group-content">
                          {group.issues.map(issue => (
                            <label key={issue.id} className={`sv-pull-item ${selectedIssueIds.includes(issue.id) ? 'selected' : ''}`}>
                              <input type="checkbox" checked={selectedIssueIds.includes(issue.id)} onChange={() => toggleIssueSelection(issue.id)} />
                              <div className="sv-pull-item-title">
                                <span className="sv-pull-item-id">#{issue.id.substring(0, 6)}</span>
                                {issue.title}
                              </div>
                            </label>
                          ))}
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <p className="sv-pull-empty">No unassigned issues in the backlog!</p>
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