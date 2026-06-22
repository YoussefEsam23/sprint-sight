import React, { useState, useEffect } from 'react';
import InviteMemberModal from './InviteMemberModel';
import CustomDropdown from './CustomDropdown';

const TeamView = ({ projectId }) => {
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [members, setMembers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

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

  // --- THE PERMISSION MATRIX ---
  const checkCanManage = (targetRole, targetUserId) => {
    if (targetUserId === currentUserId) return false; 
    if (myRole === 'CREATOR') return true; 
    if (myRole === 'PRODUCT_OWNER') {
      return ['DEVELOPER', 'VIEWER', 'SCRUM_MASTER'].includes(targetRole);
    }
    if (myRole === 'SCRUM_MASTER') {
      return ['DEVELOPER', 'VIEWER'].includes(targetRole);
    }
    return false;
  };

  const getAssignableRoles = () => {
    if (myRole === 'CREATOR') return ['PRODUCT_OWNER', 'SCRUM_MASTER', 'DEVELOPER', 'VIEWER'];
    if (myRole === 'PRODUCT_OWNER') return ['SCRUM_MASTER', 'DEVELOPER', 'VIEWER'];
    if (myRole === 'SCRUM_MASTER') return ['DEVELOPER', 'VIEWER'];
    return [];
  };

  // ==========================================
  // API FUNCTIONS
  // ==========================================

  const handleUpdateRole = async (userIdToUpdate, newRole, usernameToUpdate) => {
    if (!window.confirm(`Change @${usernameToUpdate}'s role to ${newRole.replace('_', ' ')}?`)) {
      return;
    }

    try {
      const token = localStorage.getItem('sprintSightToken');
      const xsrfToken = getCookie('XSRF-TOKEN');

      const response = await fetch(`/api/projects/${projectId}/members/${userIdToUpdate}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-XSRF-TOKEN': xsrfToken,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ projectRole: newRole }) 
      });

      if (response.ok) {
        setMembers(prevMembers => prevMembers.map(m => {
          if (m.member?.id === userIdToUpdate) {
            return { ...m, projectRole: newRole };
          }
          return m;
        }));
      } else {
        const errorData = await response.json();
        alert(`Failed to update role: ${errorData.message || 'Server rejected the request.'}`);
      }
    } catch (error) {
      console.error("Network error while updating role:", error);
      alert("Network error. Please try again.");
    }
  };

  const handleRemoveMember = async (userIdToRemove, usernameToRemove) => {
    if (!window.confirm(`Are you sure you want to remove @${usernameToRemove} from the project?`)) {
      return;
    }

    try {
      const token = localStorage.getItem('sprintSightToken');
      const xsrfToken = getCookie('XSRF-TOKEN');

      const response = await fetch(`/api/projects/${projectId}/members/${userIdToRemove}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-XSRF-TOKEN': xsrfToken,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        setMembers(prevMembers => prevMembers.filter(m => m.member?.id !== userIdToRemove));
      } else {
        const errorData = await response.json();
        alert(`Failed to remove member: ${errorData.message || 'Server rejected the request.'}`);
      }
    } catch (error) {
      console.error("Network error while removing member:", error);
      alert("Network error. Please try again.");
    }
  };

  const fetchMembers = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('sprintSightToken');
      const xsrfToken = getCookie('XSRF-TOKEN');

      const response = await fetch(`/api/projects/${projectId}/members`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-XSRF-TOKEN': xsrfToken,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setMembers(data.data || data || []);
      }
    } catch (error) {
      console.error("Network error fetching team members:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (projectId) {
      fetchMembers();
    }
  }, [projectId]);

  return (
    <div className="content-left">
      
      <div className="page-header">
        <div>
          <p className="page-subtitle">WORKSPACE ROSTER</p>
          <h1 className="page-title">Project Team</h1>
        </div>
        
        <div className="header-actions">
          {canInvite && (
            <button className="new-story-btn" onClick={() => setIsInviteModalOpen(true)}>
              + Invite Member
            </button>
          )}
        </div>
      </div>

      {isLoading ? (
        <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>
          <h3>Loading team roster...</h3>
        </div>
      ) : members.length === 0 ? (
        <div style={{ 
          backgroundColor: 'var(--bg-card, #F8FAFC)', 
          padding: '4rem', 
          borderRadius: '12px', 
          textAlign: 'center', 
          color: 'var(--text-muted, #64748B)',
          border: '1px dashed var(--border-color, #CBD5E1)'
        }}>
          <h3 style={{ color: 'var(--text-main)', marginBottom: '0.5rem' }}>No team members yet</h3>
          <p>You are the only one here! Click "+ Invite Member" to start collaborating.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.2rem' }}>
          {members.map((member, index) => {
            const username = member.member?.username || 'Unknown';
            const fullName = member.member?.fullName || username;
            const role = member.projectRole || 'MEMBER';
            const memberId = member.member?.id; 

            const canManageThisUser = checkCanManage(role, memberId);
            const assignableRoles = getAssignableRoles();

            return (
              <div key={memberId || index} style={{ 
                display: 'flex', 
                alignItems: 'center', 
                padding: '1.2rem', 
                backgroundColor: 'var(--bg-card)', 
                borderRadius: '12px', 
                border: '1px solid var(--border-color)',
                boxShadow: 'var(--card-shadow)',
                transition: 'transform 0.2s, border-color 0.2s',
                cursor: 'default'
              }}
              onMouseOver={(e) => e.currentTarget.style.borderColor = 'var(--accent-color)'}
              onMouseOut={(e) => e.currentTarget.style.borderColor = 'var(--border-color)'}
              >
                {/* Avatar */}
                <div style={{ 
                  width: '45px', 
                  height: '45px', 
                  borderRadius: '50%', 
                  background: 'linear-gradient(135deg, var(--accent-color, #F59E0B), #fcd34d)', 
                  display: 'flex', 
                  justifyContent: 'center', 
                  alignItems: 'center', 
                  color: '#111', 
                  fontWeight: 'bold', 
                  fontSize: '1.2rem',
                  marginRight: '1rem',
                  boxShadow: '0 2px 8px rgba(245, 158, 11, 0.3)',
                  overflow: 'hidden' /* <-- CRITICAL: This forces the image to stay inside the circle */
                }}>
                  {member.member?.profilePictureUrl ? (
                    <img 
                      src={member.member.profilePictureUrl} 
                      alt={`${username}'s profile`} 
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                    />
                  ) : (
                    username.charAt(0).toUpperCase()
                  )}
                </div>

                {/* User Details */}
                <div style={{ flexGrow: 1, overflow: 'hidden' }}>
                  <h4 style={{ margin: '0 0 0.2rem 0', color: 'var(--text-main)', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                    {fullName} {memberId === currentUserId && <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: 'normal' }}>(You)</span>}
                  </h4>
                  <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                    @{username}
                  </p>
                </div>

                {/* Right Side: Role Badge/Dropdown & Remove Button */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
                  
                  {/* --- NEW: USING THE REUSABLE GLOBAL COMPONENT! --- */}
                  {canManageThisUser ? (
                    <CustomDropdown 
                      currentValue={role}
                      options={assignableRoles}
                      readOnlyLabel={!assignableRoles.includes(role) ? role : null}
                      onChange={(newRole) => handleUpdateRole(memberId, newRole, username)}
                    />
                  ) : (
                    <span style={{ 
                      fontSize: '0.7rem', 
                      padding: '4px 10px', 
                      backgroundColor: 'var(--bg-hover)', 
                      color: 'var(--text-main)', 
                      borderRadius: '12px', 
                      fontWeight: '700',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px'
                    }}>
                      {role.replace('_', ' ')}
                    </span>
                  )}
                  
                  {/* --- REMOVE BUTTON --- */}
                  {canManageThisUser && (
                    <button 
                      onClick={() => handleRemoveMember(memberId, username)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: '#EF4444',
                        fontSize: '0.75rem',
                        fontWeight: '600',
                        cursor: 'pointer',
                        padding: '2px 4px',
                        transition: 'opacity 0.2s',
                      }}
                      onMouseOver={(e) => e.target.style.opacity = 0.7}
                      onMouseOut={(e) => e.target.style.opacity = 1}
                    >
                      Remove
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <InviteMemberModal 
        isOpen={isInviteModalOpen} 
        onClose={() => setIsInviteModalOpen(false)} 
        projectId={projectId} 
      />
    </div>
  );
};

export default TeamView;