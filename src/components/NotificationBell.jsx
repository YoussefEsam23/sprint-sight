import React, { useState, useEffect, useRef } from 'react';
import '../styling/NotificationBell.css'; // <-- Import the new CSS!

const NotificationBell = ({ onInviteAccepted }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [invitations, setInvitations] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const dropdownRef = useRef(null);

  const getXsrfToken = () => {
    return document.cookie
      .split('; ')
      .find(row => row.startsWith('XSRF-TOKEN='))
      ?.split('=')[1];
  };

  const fetchInvitations = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('sprintSightToken');
      
      const userString = localStorage.getItem('sprintSightUser');
      if (!userString) {
        console.error("No user found in localStorage. Cannot fetch invitations.");
        setIsLoading(false);
        return;
      }
      
      const user = JSON.parse(userString);
      const currentUserId = user.id;

      if (!currentUserId) {
        console.error("User object found, but ID is missing.");
        setIsLoading(false);
        return;
      }

      const xsrfToken = getXsrfToken();

      const response = await fetch(`/api/users/${currentUserId}/invitations`, {
        method: 'GET',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'X-XSRF-TOKEN': xsrfToken, 
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setInvitations(data.data || []); 
      }
    } catch (error) {
      console.error("Network error while fetching invitations:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBellClick = () => {
    const willOpen = !isOpen;
    setIsOpen(willOpen); 
    
    if (willOpen) {
      fetchInvitations();
    }
  };

  const handleRespond = async (invitationId, action) => {
    try {
      const token = localStorage.getItem('sprintSightToken');
      const xsrfToken = getXsrfToken();

      const response = await fetch(`/api/invitations/${invitationId}/${action}`, {
        method: 'POST', 
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-XSRF-TOKEN': xsrfToken,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        setInvitations(prev => prev.filter(inv => inv.id !== invitationId));
        if (action === 'accept' && onInviteAccepted) {
          onInviteAccepted(); 
        }
      } else {
        console.error(`Backend rejected the ${action} action:`, response.status);
      }
      
    } catch (error) {
      console.error(`Network error while trying to ${action} invitation:`, error);
    }
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={dropdownRef} className="notification-wrapper">
      
      <button 
        className="icon-btn"
        onClick={handleBellClick} 
        title="Notifications"
      >
        🔔
      </button>

      {isOpen && (
        <div className="notification-dropdown">
          <h4 className="notification-header">Pending Invitations</h4>
          
          {isLoading ? (
            <p className="notification-empty-text">Loading invites...</p>
          ) : invitations.length === 0 ? (
            <p className="notification-empty-text">No new notifications.</p>
          ) : (
            <div className="notification-list">
              {invitations.map(invite => (
                <div key={invite.id} className="invite-card">
                  <p className="invite-card-text">
                    You have been invited to join <br/>
                    <strong className="invite-project-name">{invite.projectName}</strong><br/>
                    <span className="invite-role-text">Role: {invite.intendedRole}</span>
                  </p>
                  <div className="invite-actions">
                    <button onClick={() => handleRespond(invite.id, 'accept')} className="accept-btn">Accept</button>
                    <button onClick={() => handleRespond(invite.id, 'reject')} className="reject-btn">Reject</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default NotificationBell;