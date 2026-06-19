import React, { useState, useEffect } from 'react';
import InviteMemberModal from './InviteMemberModel';

const TeamViewMock = ({ projectId }) => {
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  
  // --- NEW: STATE FOR TEAM MEMBERS ---
  const [members, setMembers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // --- NEW: FETCH MEMBERS LOGIC ---
  const fetchMembers = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('sprintSightToken');
      
      const getCookie = (name) => {
        const value = `; ${document.cookie}`;
        const parts = value.split(`; ${name}=`);
        if (parts.length === 2) return parts.pop().split(';').shift();
        return null;
      };
      const xsrfToken = getCookie('XSRF-TOKEN');

      // ⚠️ Note: Adjust this URL if your backend team named it differently!
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
        // Fallback checks depending on how your backend wraps lists (e.g., data.data vs just data)
        setMembers(data.data || data || []);
      } else {
        console.error("Failed to fetch project members. Status:", response.status);
      }
    } catch (error) {
      console.error("Network error fetching team members:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch the roster the moment the Team tab is opened
  useEffect(() => {
    if (projectId) {
      fetchMembers();
    }
  }, [projectId]);

  return (
    <div style={{ padding: '1rem', maxWidth: '1000px', margin: '0 auto' }}>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: '600', letterSpacing: '1px', marginBottom: '0.4rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ display: 'block', width: '8px', height: '8px', backgroundColor: 'var(--accent-color)', borderRadius: '50%' }}></span>
            WORKSPACE ROSTER
          </p>
          <h2 style={{ margin: 0, color: 'var(--text-primary)', fontSize: '1.8rem' }}>Project Team</h2>
        </div>
        
        <button 
          onClick={() => setIsInviteModalOpen(true)}
          style={{ 
            padding: '10px 20px', 
            backgroundColor: 'var(--accent-color, #F5A623)', 
            color: 'var(--btn-text, #111)', 
            borderRadius: '8px', 
            border: 'none', 
            cursor: 'pointer', 
            fontWeight: 'bold',
            transition: 'all 0.2s ease',
            boxShadow: '0 4px 12px rgba(245, 158, 11, 0.2)'
          }}
          onMouseOver={(e) => e.target.style.transform = 'translateY(-2px)'}
          onMouseOut={(e) => e.target.style.transform = 'translateY(0)'}
        >
          + Invite Member
        </button>
      </div>

      {/* --- REAL DYNAMIC MEMBER LIST --- */}
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
          <h3>No team members yet</h3>
          <p>You are the only one here! Click "+ Invite Member" to start collaborating.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.2rem' }}>
          {members.map((member, index) => {
            // Safely extract the user details depending on how the backend sends it
            // (Sometimes it's member.user.username, sometimes it's flattened to member.username)
            const username = member.user?.username || member.username || 'Unknown';
            const fullName = member.user?.fullName || member.fullName || username;
            const role = member.role || member.projectRole || 'MEMBER';
            const memberId = member.id || index;

            return (
              <div key={memberId} style={{ 
                display: 'flex', 
                alignItems: 'center', 
                padding: '1.2rem', 
                backgroundColor: 'var(--bg-card)', 
                borderRadius: '12px', 
                border: '1px solid var(--border-color)',
                boxShadow: 'var(--card-shadow)'
              }}>
                {/* Avatar */}
                <div style={{ 
                  width: '45px', 
                  height: '45px', 
                  borderRadius: '50%', 
                  background: 'linear-gradient(135deg, var(--accent-color), #fcd34d)', 
                  display: 'flex', 
                  justifyContent: 'center', 
                  alignItems: 'center', 
                  color: 'var(--btn-text)', 
                  fontWeight: 'bold', 
                  fontSize: '1.2rem',
                  marginRight: '1rem',
                  boxShadow: '0 2px 8px rgba(245, 158, 11, 0.3)'
                }}>
                  {username.charAt(0).toUpperCase()}
                </div>

                {/* User Details */}
                <div style={{ flexGrow: 1, overflow: 'hidden' }}>
                  <h4 style={{ margin: '0 0 0.2rem 0', color: 'var(--text-main)', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                    {fullName}
                  </h4>
                  <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                    @{username}
                  </p>
                </div>

                {/* Role Badge */}
                <div>
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
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* The Invite Modal */}
      <InviteMemberModal 
        isOpen={isInviteModalOpen} 
        onClose={() => setIsInviteModalOpen(false)} 
        projectId={projectId} 
      />
    </div>
  );
};

export default TeamViewMock;