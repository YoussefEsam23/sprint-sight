import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import '../styling/InviteMemberModel.css'; // <-- Import the new CSS!

const InviteMemberModel = ({ isOpen, onClose, projectId }) => {
  const [receiverId, setReceiverId] = useState('');
  const [intendedRole, setIntendedRole] = useState('DEVELOPER'); 
  const [status, setStatus] = useState({ type: '', message: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSendInvite = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setStatus({ type: '', message: '' });

    const getCookie = (name) => {
      const value = `; ${document.cookie}`;
      const parts = value.split(`; ${name}=`);
      if (parts.length === 2) return parts.pop().split(';').shift();
      return null;
    };

    try {
      const token = localStorage.getItem('sprintSightToken');
      const xsrfToken = getCookie('XSRF-TOKEN');

      await fetch(`api/auth/refresh` , {
        method : 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'X-XSRF-TOKEN': xsrfToken
        }
      });

      const searchResponse = await fetch(`/api/users/username/${receiverId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-XSRF-TOKEN': xsrfToken,
          'Content-Type': 'application/json'
        }
      });

      if (!searchResponse.ok) {
        setStatus({ type: 'error', message: `User '${receiverId}' not found.` });
        setIsSubmitting(false);
        return; 
      }

      const userData = await searchResponse.json();
      const actualUserUuid = userData.data?.id || userData.id; 

      if (!actualUserUuid) {
        setStatus({ type: 'error', message: 'User found, but UUID is missing.' });
        setIsSubmitting(false);
        return;
      }

      const inviteResponse = await fetch(`/api/projects/${projectId}/invitations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'X-XSRF-TOKEN': xsrfToken
        },
        body: JSON.stringify({
          receiverId: actualUserUuid, 
          intendedRole: intendedRole
        })
      });

      const inviteData = await inviteResponse.json();

      if (inviteResponse.ok) {
        setStatus({ type: 'success', message: 'Invitation sent successfully!' });
        setReceiverId(''); 
        setTimeout(() => onClose(), 2000); 
      } else {
        setStatus({ type: 'error', message: inviteData.message || 'Failed to send invite.' });
      }

    } catch (error) {
      console.error("Invite error:", error);
      setStatus({ type: 'error', message: 'Server error. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return createPortal(
    <div className="modal-overlay" style={{ zIndex: 999999 }}>
      <div className="modal-content">
        <h2 className="invite-modal-header">Invite Team Member</h2>
        <p className="invite-modal-subtitle">
          Send an invitation to collaborate on this project.
        </p>

        <form onSubmit={handleSendInvite} className="invite-form">
          
          <div className="form-group">
            <label className="invite-label">Username</label>
            <input 
              type="text" 
              placeholder="e.g., youssef123" 
              value={receiverId}
              onChange={(e) => setReceiverId(e.target.value)}
              required
              className="invite-input"
            />
          </div>

          <div className="form-group">
            <label className="invite-label">Project Role</label>
            <select 
              value={intendedRole} 
              onChange={(e) => setIntendedRole(e.target.value)}
              className="invite-input"
            >
              <option value="DEVELOPER">Developer (Can edit tasks)</option>
              <option value="SCRUM_MASTER">Scrum Master (Can manage sprints)</option>
              <option value="PRODUCT_OWNER">Product Owner (Can manage backlog)</option>
              <option value="VIEWER">Viewer (Read-only access)</option>
            </select>
          </div>

          {status.message && (
            <div className={`invite-status-msg ${status.type === 'error' ? 'invite-status-error' : 'invite-status-success'}`}>
              {status.message}
            </div>
          )}

          <div className="invite-action-group">
            <button 
              type="button" 
              onClick={onClose} 
              disabled={isSubmitting}
              className="invite-cancel-btn"
            >
              Cancel
            </button>
            <button 
              type="submit" 
              disabled={isSubmitting}
              className="invite-submit-btn"
            >
              {isSubmitting ? 'Sending...' : 'Send Invite'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};

export default InviteMemberModel;