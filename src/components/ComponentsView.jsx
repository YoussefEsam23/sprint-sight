import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { createPortal } from 'react-dom';
import '../styling/ComponentsView.css';

const ComponentsView = () => {
  const { projectId } = useParams();
  
  const [components, setComponents] = useState([]);
  const [issues, setIssues] = useState([]); // <-- NEW: State to hold project issues
  const [currentUserRole, setCurrentUserRole] = useState('VIEWER');
  const [isLoading, setIsLoading] = useState(true);
  
  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false); // For Creating
  const [viewingComponent, setViewingComponent] = useState(null); // For Viewing Details
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({ name: '', description: '' });

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

  const fetchData = async () => {
    setIsLoading(true);
    try {
      // Fetch Members, Components, AND Issues all at once!
      const [membersRes, componentsRes, issuesRes] = await Promise.all([
        fetch(`/api/projects/${projectId}/members`, { headers: getAuthHeaders() }),
        fetch(`/api/projects/${projectId}/components`, { headers: getAuthHeaders() }),
        fetch(`/api/projects/${projectId}/issues`, { headers: getAuthHeaders() })
      ]);

      if (membersRes.ok) {
        const membersData = await membersRes.json();
        const storedUser = JSON.parse(localStorage.getItem('sprintSightUser')) || {};
        const myRecord = (membersData.data || []).find(m => m.member.id === storedUser.id);
        if (myRecord) setCurrentUserRole(myRecord.projectRole);
      }

      if (componentsRes.ok) {
        const componentsData = await componentsRes.json();
        setComponents(componentsData.data || []);
      }

      if (issuesRes.ok) {
        const issuesData = await issuesRes.json();
        console.log("List of issues from backend:", issuesData.data);
        setIssues(issuesData.data || []);
      }

    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (projectId) fetchData();
  }, [projectId]);

  // Allow CREATOR, PRODUCT_OWNER, and SCRUM_MASTER to manage components
  const canManageComponents = ['CREATOR', 'PRODUCT_OWNER', 'SCRUM_MASTER'].includes(currentUserRole);

  const handleCreateComponent = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) return;
    
    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/projects/${projectId}/components`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        setFormData({ name: '', description: '' });
        setIsModalOpen(false);
        fetchData();
      } else {
        const err = await response.json();
        alert(err.message || 'Failed to create component.');
      }
    } catch (error) {
      console.error("Error creating component:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteComponent = async (e, componentId) => {
    e.stopPropagation(); // Stops the card click event from firing when you click delete!
    if (!window.confirm("Are you sure you want to delete this component? It cannot be deleted if issues are assigned to it.")) return;
    
    try {
      const response = await fetch(`/api/projects/${projectId}/components/${componentId}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });

      if (response.ok) {
        setViewingComponent(null);
        fetchData();
      } else {
        const err = await response.json();
        alert(err.message || "Failed to delete component.");
      }
    } catch (error) {
      console.error("Error deleting component:", error);
    }
  };

  return (
    <>
      <div className="cv-container">
        <div className="cv-header">
          <div>
            <p className="cv-subtitle">COMPONENTS OVERVIEW</p>
            <h1 className="cv-title">Project Components</h1>
          </div>
          {canManageComponents && (
            <div className="cv-header-actions">
              <button className="cv-create-btn" onClick={() => setIsModalOpen(true)}>+ CREATE COMPONENT</button>
            </div>
          )}
        </div>

        {isLoading ? (
          <div className="cv-empty-state">
            <h2>Loading Components...</h2>
          </div>
        ) : (
          <>
            {components.length > 0 ? (
              <div className="cv-grid">
                {components.map(component => (
                  
                  <div 
                    key={component.id} 
                    className="cv-card" 
                    onClick={() => setViewingComponent(component)}
                    style={{ cursor: 'pointer' }}
                  >
                    <div className="cv-card-header">
                      <h3 className="cv-card-title">{component.name}</h3>
                      {canManageComponents && (
                        <button className="cv-delete-btn" onClick={(e) => handleDeleteComponent(e, component.id)} title="Delete Component">
                          Delete
                        </button>
                      )}
                    </div>
                    <p className="cv-card-desc">
                      {component.description || <span style={{ fontStyle: 'italic', opacity: 0.5 }}>No description provided.</span>}
                    </p>
                  </div>

                ))}
              </div>
            ) : (
              <div className="cv-empty-state">
                <h2>No components yet.</h2>
                <p>{canManageComponents ? "Click '+ Create Component' to start organizing your issues." : "Waiting for the Scrum Master to create components."}</p>
              </div>
            )}
          </>
        )}
      </div>

      {/* ======================================================== */}
      {/* MODAL 1: VIEW COMPONENT DETAILS & ISSUES                 */}
      {/* ======================================================== */}
      {viewingComponent && createPortal(
       <div className="bv-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setViewingComponent(null); }}>
          {/* Reusing the split layout from BacklogView! */}
          <div className="bv-view-modal">
            
            {/* LEFT SIDE: Component Details */}
            <div className="bv-view-left">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 'bold', color: 'var(--accent-color)', textTransform: 'uppercase' }}>
                  Component Details
                </span>
              </div>
              
              <h2 style={{ margin: '0 0 1.5rem 0', fontSize: '1.8rem', color: 'var(--text-main)', lineHeight: '1.2' }}>
                {viewingComponent.name}
              </h2>
              
              <div style={{ marginBottom: '2rem' }}>
                <h4 style={{ color: 'var(--text-muted)', marginBottom: '0.5rem', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Description</h4>
                <p style={{ color: 'var(--text-main)', lineHeight: '1.6', whiteSpace: 'pre-wrap', backgroundColor: 'var(--bg-main)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                  {viewingComponent.description || <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>No description provided.</span>}
                </p>
              </div>

              <div className="bv-modal-actions" style={{ marginTop: 'auto', borderTop: 'none', padding: 0 }}>
                <button className="bv-btn bv-cancel-btn" onClick={() => setViewingComponent(null)}>Close</button>
              </div>
            </div>

            {/* RIGHT SIDE: Associated Issues */}
            <div className="bv-view-right">
              <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.1rem', color: 'var(--text-main)' }}>Assigned Issues</h3>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', paddingRight: '8px' }}>
                {(() => {
                  // Filter all issues to find the ones that contain this component's ID
                  const assignedIssues = issues.filter(issue => 
                    issue.components && issue.components.some(c => c.id === viewingComponent.id)
                  );

                  if (assignedIssues.length === 0) {
                    return <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>No issues are currently assigned to this component.</p>;
                  }

                  // Render mini issue cards
                  return assignedIssues.map(issue => (
                    <div key={issue.id} style={{ backgroundColor: 'var(--bg-card)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--accent-color)', textTransform: 'uppercase' }}>
                          {issue.type?.name || 'Issue'}
                        </span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          #{issue.id?.substring(0, 6)}
                        </span>
                      </div>
                      <h4 style={{ margin: '0 0 8px 0', fontSize: '0.95rem', color: 'var(--text-main)' }}>
                        {issue.title}
                      </h4>
                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        {issue.status && <span className="bv-badge" style={{ fontSize: '0.75rem', padding: '2px 8px' }}>{issue.status.name}</span>}
                        {issue.assignedTo && <span className="bv-badge" style={{ fontSize: '0.75rem', padding: '2px 8px' }}>👤 {issue.assignedTo.username}</span>}
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
      {/* MODAL 2: CREATE COMPONENT FORM                           */}
      {/* ======================================================== */}
      {isModalOpen && canManageComponents && createPortal(
        <div className="bv-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setIsModalOpen(false); }}>
          <div className="bv-modal-content" style={{ maxWidth: '500px' }}>
            <h2 className="bv-modal-title">Create New Component</h2>
            
            <form className="bv-modal-form" onSubmit={handleCreateComponent}>
              <div className="bv-form-group">
                <label>Component Name</label>
                <input 
                  type="text" 
                  className="bv-modal-input" 
                  placeholder="e.g., Frontend, Database, Payment Gateway" 
                  maxLength={100}
                  value={formData.name} 
                  onChange={(e) => setFormData({...formData, name: e.target.value})} 
                  required 
                />
              </div>
              
              <div className="bv-form-group">
                <label>Description (Optional)</label>
                <textarea 
                  className="bv-modal-input" 
                  placeholder="What does this component cover?" 
                  maxLength={500}
                  style={{ minHeight: '80px' }}
                  value={formData.description} 
                  onChange={(e) => setFormData({...formData, description: e.target.value})} 
                />
              </div>

              <div className="bv-modal-actions">
                <button type="button" className="bv-btn bv-cancel-btn" onClick={() => setIsModalOpen(false)}>Cancel</button>
                <button type="submit" disabled={isSubmitting} className="bv-btn bv-save-btn">
                  {isSubmitting ? 'Creating...' : 'Create Component'}
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

export default ComponentsView;