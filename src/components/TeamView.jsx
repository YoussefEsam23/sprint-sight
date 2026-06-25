import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import InviteMemberModal from './InviteMemberModel';
import CustomDropdown from './CustomDropdown';
import '../styling/TeamView.css';

const TeamView = ({ projectId }) => {
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [members, setMembers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // --- MODAL STATES ---
  const [selectedMember, setSelectedMember] = useState(null);
  const [editRole, setEditRole] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // --- GLOBAL COOKIE HELPER ---
  const getCookie = (name) => {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
    return null;
  };

  // ==========================================
  // FRONTEND ROLE-BASED ACCESS CONTROL (RBAC)
  // ==========================================
  const storedUser = JSON.parse(localStorage.getItem('sprintSightUser')) || {};
  const currentUsername = storedUser.username;
  const currentUserId = storedUser.id || storedUser._id;

  const currentUserRecord = members.find(m => m.member?.username === currentUsername);
  const myRole = currentUserRecord?.projectRole || 'CREATOR';
  const canInvite = myRole !== 'VIEWER' && myRole !== 'DEVELOPER';

  const checkCanManage = (targetRole, targetUserId) => {
    if (targetUserId === currentUserId) return false; 
    if (myRole === 'CREATOR') return true;
    if (myRole === 'PRODUCT_OWNER' && targetRole !== 'CREATOR') return true;
    if (myRole === 'SCRUM_MASTER' && targetRole !== 'CREATOR' && targetRole !== 'PRODUCT_OWNER') return true;
    return false;
  };

  const getAvailableRoles = () => {
    if (myRole === 'CREATOR') return ['PRODUCT_OWNER', 'SCRUM_MASTER', 'DEVELOPER', 'VIEWER'];
    if (myRole === 'PRODUCT_OWNER') return ['SCRUM_MASTER', 'DEVELOPER', 'VIEWER'];
    if (myRole === 'SCRUM_MASTER') return ['DEVELOPER', 'VIEWER'];
    return [];
  };

  const fetchMembers = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/projects/${projectId}/members`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('sprintSightToken')}`,
          'X-XSRF-TOKEN': getCookie('XSRF-TOKEN')
        }
      });
      if (response.ok) {
        const data = await response.json();
        setMembers(data.data || []);
      }
    } catch (error) {
      console.error("Failed to fetch members", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (projectId) fetchMembers();
  }, [projectId]);

  // --- MODAL ACTIONS ---
  const openEditModal = (record) => {
    setSelectedMember(record);
    setEditRole(record.projectRole);
  };

  const handleSaveRole = async () => {
    if (editRole === selectedMember.projectRole) {
      setSelectedMember(null);
      return;
    }
    
    setIsSubmitting(true);
    try {
      // FIX 1 & 2: Change method to PUT and remove "/role" from the end of the URL
      const response = await fetch(`/api/projects/${projectId}/members/${selectedMember.member.id}`, {
        method: 'PUT', 
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('sprintSightToken')}`,
          'X-XSRF-TOKEN': getCookie('XSRF-TOKEN')
        },
        // FIX 3: Send the property name that standard Spring Boot records expect
        body: JSON.stringify({ projectRole: editRole }) 
      });

      if (response.ok) {
        setMembers(members.map(m => m.member.id === selectedMember.member.id ? { ...m, projectRole: editRole } : m));
        setSelectedMember(null);
      } else {
        const err = await response.json();
        alert(err.message || 'Failed to update role');
      }
    } catch (error) {
      console.error("Role update failed:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemoveMember = async () => {
    if (!window.confirm(`Are you sure you want to remove ${selectedMember.member.username} from the project?`)) return;
    
    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/projects/${projectId}/members/${selectedMember.member.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('sprintSightToken')}`,
          'X-XSRF-TOKEN': getCookie('XSRF-TOKEN')
        }
      });

      if (response.ok) {
        setMembers(members.filter(m => m.member.id !== selectedMember.member.id));
        setSelectedMember(null);
      } else {
        alert('Failed to remove member');
      }
    } catch (error) {
      console.error("Failed to remove member:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <div className="tv-container">
        <div className="tv-header">
          <h2 className="tv-title">Project Team</h2>
          {canInvite && (
            <button 
              className="tv-invite-btn"
              onClick={() => setIsInviteModalOpen(true)}
            >
              + Invite Member
            </button>
          )}
        </div>

        {isLoading ? (
          <p className="tv-loading">Loading team members...</p>
        ) : (
          <div className="tv-grid">
            {members.map((record) => {
              const memberId = record.member.id;
              const username = record.member.username;
              const fullName = record.member.fullName;
              const profilePic = record.member.profilePictureUrl || record.member.imageUrl;
              const initial = username ? username.charAt(0).toUpperCase() : 'U';
              const role = record.projectRole;

              return (
                <div 
                  key={memberId} 
                  className="tv-card"
                  onClick={() => openEditModal(record)}
                >
                  <div className="tv-avatar" style={{ padding: profilePic ? 0 : '' }}>
                    {profilePic ? (
                      <img src={profilePic} alt="Profile" className="tv-avatar-img" />
                    ) : (
                      initial
                    )}
                  </div>

                  <div className="tv-info">
                    <h3 className="tv-name">{fullName || username}</h3>
                    <p className="tv-username">@{username}</p>
                  </div>

                  <div className="tv-actions">
                    <span className="tv-role-badge">
                      {role.replace('_', ' ')}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <InviteMemberModal 
        isOpen={isInviteModalOpen} 
        onClose={() => setIsInviteModalOpen(false)} 
        projectId={projectId} 
      />

      {/* ======================================================== */}
      {/* MODAL: EDIT MEMBER DETAILS (Triggered by Card Click)     */}
      {/* ======================================================== */}
      {selectedMember && createPortal(
        <div className="tv-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setSelectedMember(null); }}>
          <div className="tv-modal-content">
            
            <div className="tv-modal-header">
              <div className="tv-modal-avatar" style={{ padding: (selectedMember.member.profilePictureUrl || selectedMember.member.imageUrl) ? 0 : '' }}>
                {(selectedMember.member.profilePictureUrl || selectedMember.member.imageUrl) ? (
                  <img src={selectedMember.member.profilePictureUrl || selectedMember.member.imageUrl} alt="Profile" style={{width: '100%', height: '100%', objectFit: 'cover'}} />
                ) : (
                  selectedMember.member.username.charAt(0).toUpperCase()
                )}
              </div>
              <div className="tv-modal-info">
                <h3>{selectedMember.member.fullName || selectedMember.member.username}</h3>
                <p>@{selectedMember.member.username}</p>
              </div>
            </div>

            {checkCanManage(selectedMember.projectRole, selectedMember.member.id) ? (
              <>
                <div className="tv-modal-form-group">
                  <label>Assign Project Role</label>
                  <CustomDropdown 
                    currentValue={editRole}
                    options={getAvailableRoles()}
                    onChange={(newRole) => setEditRole(newRole)}
                  />
                </div>

                <div className="tv-modal-actions">
                  <button type="button" className="tv-modal-btn tv-btn-remove" disabled={isSubmitting} onClick={handleRemoveMember}>
                    Remove Member
                  </button>
                  <button type="button" className="tv-modal-btn tv-btn-cancel" onClick={() => setSelectedMember(null)}>
                    Cancel
                  </button>
                  <button type="button" className="tv-modal-btn tv-btn-save" disabled={isSubmitting} onClick={handleSaveRole}>
                    {isSubmitting ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </>
            ) : (
              <div style={{ textAlign: 'center' }}>
                <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>
                  Current Role: <strong style={{ color: 'var(--text-main)' }}>{selectedMember.projectRole.replace('_', ' ')}</strong>
                </p>
                <button type="button" className="tv-modal-btn tv-btn-cancel" style={{ width: '100%' }} onClick={() => setSelectedMember(null)}>
                  Close
                </button>
              </div>
            )}

          </div>
        </div>,
        document.body
      )}
    </>
  );
};

export default TeamView;