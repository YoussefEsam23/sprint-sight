import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import '../styling/BacklogView.css';
import '../styling/SprintsView.css';
import '../styling/HistoryView.css'; // <-- New Import

const HistoryView = () => {
  const { projectId } = useParams();
  const [activeTab, setActiveTab] = useState('sprints'); 
  
  const [completedSprints, setCompletedSprints] = useState([]);
  const [completedIssues, setCompletedIssues] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const getCookie = (name) => {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
    return null;
  };

  const fetchHistoryData = async () => {
    setIsLoading(true);
    try {
      const headers = {
        'Authorization': `Bearer ${localStorage.getItem('sprintSightToken')}`,
        'X-XSRF-TOKEN': getCookie('XSRF-TOKEN'),
        'Content-Type': 'application/json'
      };

      const [sprintsRes, issuesRes] = await Promise.all([
        fetch(`/api/projects/${projectId}/sprints`, { headers }),
        fetch(`/api/projects/${projectId}/issues`, { headers })
      ]);

      if (sprintsRes.ok) {
        const summaries = (await sprintsRes.json()).data || [];
        setCompletedSprints(summaries.filter(s => s.status === 'COMPLETED'));
      }

      if (issuesRes.ok) {
        const issuesData = (await issuesRes.json()).data || [];
        setCompletedIssues(issuesData.filter(i => i.status?.isCompleted || i.status?.name?.toLowerCase() === 'done'));
      }

    } catch (error) {
      console.error("Error fetching history:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (projectId) fetchHistoryData();
  }, [projectId]);

  const formatDisplayDate = (dateVal) => {
    if (!dateVal) return 'Not set';
    if (Array.isArray(dateVal)) return new Date(dateVal[0], dateVal[1] - 1, dateVal[2]).toLocaleDateString();
    if (typeof dateVal === 'string') {
      const parsed = new Date(dateVal);
      if (!isNaN(parsed)) return parsed.toLocaleDateString();
    }
    return String(dateVal);
  };

  return (
    <div className="content-left">
      <div className="page-header">
        <div>
          <p className="page-subtitle">PROJECT HISTORY</p>
          <h1 className="page-title">History Archive</h1>
        </div>
      </div>

      <div className="hv-tabs-container">
        <button 
          className={`hv-tab-btn ${activeTab === 'sprints' ? 'active' : ''}`}
          onClick={() => setActiveTab('sprints')}
        >
          Completed Sprints ({completedSprints.length})
        </button>
        <button 
          className={`hv-tab-btn ${activeTab === 'issues' ? 'active' : ''}`}
          onClick={() => setActiveTab('issues')}
        >
          Completed Issues ({completedIssues.length})
        </button>
      </div>

      {isLoading ? (
        <div className="sv-loading-state"><h3>Loading history...</h3></div>
      ) : (
        <div>
          {activeTab === 'sprints' && (
            <div className="sv-container">
              {completedSprints.map(sprint => (
                <div key={sprint.id} className="sv-sprint-card hv-archived-card">
                  <div className="sv-header sv-header-no-border">
                    <div>
                      <div className="sv-title-wrapper">
                        <h2 className="sv-title">{sprint.name}</h2>
                        <span className="sv-status-badge hv-badge-completed">
                          COMPLETED
                        </span>
                      </div>
                      <p className="sv-dates">
                        {formatDisplayDate(sprint.startDate)} &nbsp;→&nbsp; {formatDisplayDate(sprint.endDate)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
              {completedSprints.length === 0 && (
                <div className="sv-empty-board hv-empty-full">
                  <h3 className="sv-empty-board-title">No completed sprints</h3>
                </div>
              )}
            </div>
          )}

          {activeTab === 'issues' && (
            <div className="story-list">
              {completedIssues.map(issue => (
                <div key={issue.id} className="story-card hv-archived-card">
                  <div className="story-info">
                    <div className="bv-issue-header-row">
                      <span className="bv-issue-type">{issue.type?.name || 'Issue'}</span>
                    </div>
                    <h3 className="story-title">{issue.title}</h3>
                    <div className="bv-story-meta">
                      {issue.assignedTo && <span className="bv-badge">👤 {issue.assignedTo.username}</span>}
                      {issue.status && <span>Status: <strong className="bv-badge-highlight bv-badge-no-bg">{issue.status.name}</strong></span>}
                    </div>
                  </div>
                </div>
              ))}
              {completedIssues.length === 0 && (
                <div className="bv-empty-state hv-empty-full">
                  <h2>No completed issues</h2>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default HistoryView;