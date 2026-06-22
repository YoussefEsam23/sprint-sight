import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import '../styling/InviteMemberModel.css'; 
import CustomDropdown from './CustomDropdown'; 

const InviteMemberModel = ({ isOpen, onClose, projectId }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null); 
  
  const [intendedRole, setIntendedRole] = useState('DEVELOPER'); 
  const [status, setStatus] = useState({ type: '', message: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const searchContainerRef = useRef(null);

  const getCookie = (name) => {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
    return null;
  };

  useEffect(() => {
    if (!searchQuery.trim() || selectedUser) {
      setSearchResults([]);
      return;
    }

    const delayDebounceFn = setTimeout(async () => {
      setIsSearching(true);
      try {
        const token = localStorage.getItem('sprintSightToken');
        const xsrfToken = getCookie('XSRF-TOKEN');

        const response = await fetch(`/api/users/search?username=${searchQuery}&projectId=${projectId}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'X-XSRF-TOKEN': xsrfToken,
            'Content-Type': 'application/json'
          }
        });

        if (response.ok) {
          const data = await response.json();
          setSearchResults(data.data || data || []);
        }
      } catch (error) {
        console.error("Search error:", error);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery, projectId, selectedUser]);


  const handleSendInvite = async (e) => {
    e.preventDefault();
    
    if (!selectedUser) {
      setStatus({ type: 'error', message: 'Please select a user from the dropdown.' });
      return;
    }

    setIsSubmitting(true);
    setStatus({ type: '', message: '' });

    try {
      const token = localStorage.getItem('sprintSightToken');
      const xsrfToken = getCookie('XSRF-TOKEN');

      const inviteResponse = await fetch(`/api/projects/${projectId}/invitations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'X-XSRF-TOKEN': xsrfToken
        },
        body: JSON.stringify({
          receiverId: selectedUser.id, 
          intendedRole: intendedRole
        })
      });

      const inviteData = await inviteResponse.json();

      if (inviteResponse.ok) {
        setStatus({ type: 'success', message: 'Invitation sent successfully!' });
        
        setTimeout(() => {
          setSearchQuery('');
          setSelectedUser(null);
          onClose();
        }, 2000); 
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

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target)) {
        setSearchResults([]);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!isOpen) return null;

  return createPortal(
    <div className="modal-overlay" style={{ zIndex: 999999 }}>
      <div className="modal-content">
        <h2 className="invite-modal-header">Invite Team Member</h2>
        <p className="invite-modal-subtitle">
          Search for a user to invite them to this project.
        </p>

        <form onSubmit={handleSendInvite} className="invite-form">
          
          <div className="form-group" ref={searchContainerRef}>
            <label className="invite-label">Find User</label>
            
            {/* --- 1. SELECTED USER CARD --- */}
            {selectedUser ? (
              <div className="selected-user-card">
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  
                  {/* Selected User Avatar */}
                  <div className="search-avatar-mini" style={{ overflow: 'hidden', padding: selectedUser.profilePictureUrl ? 0 : '' }}>
                    {selectedUser.profilePictureUrl ? (
                      <img src={selectedUser.profilePictureUrl} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      selectedUser.username.charAt(0).toUpperCase()
                    )}
                  </div>

                  <div>
                    <div style={{ fontWeight: 'bold', color: 'var(--text-main)', fontSize: '0.9rem' }}>
                      {selectedUser.fullName || selectedUser.username}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      @{selectedUser.username}
                    </div>
                  </div>
                </div>
                <button 
                  type="button" 
                  className="clear-user-btn" 
                  onClick={() => { setSelectedUser(null); setSearchQuery(''); }}
                  title="Remove selection"
                >
                  ✕
                </button>
              </div>
            ) : (
              <div className="search-dropdown-container">
                <input 
                  type="text" 
                  placeholder="Type a username..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="invite-input"
                  autoComplete="off"
                />

                {/* --- 2. LIVE SEARCH RESULTS DROPDOWN --- */}
                {searchQuery && !selectedUser && (
                  <div className="search-results-menu">
                    {isSearching ? (
                      <div style={{ padding: '10px', fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center' }}>
                        Searching...
                      </div>
                    ) : searchResults.length > 0 ? (
                      searchResults.map(user => (
                        <div 
                          key={user.id} 
                          className="search-result-item"
                          onClick={() => {
                            setSelectedUser(user);
                            setSearchResults([]); 
                          }}
                        >
                          {/* Search Result Avatar */}
                          <div className="search-avatar-mini" style={{ overflow: 'hidden', padding: user.profilePictureUrl ? 0 : '' }}>
                            {user.profilePictureUrl ? (
                              <img src={user.profilePictureUrl} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            ) : (
                              user.username.charAt(0).toUpperCase()
                            )}
                          </div>

                          <div>
                            <div style={{ fontWeight: 'bold', color: 'var(--text-main)', fontSize: '0.85rem' }}>
                              {user.fullName || user.username}
                            </div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                              @{user.username}
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div style={{ padding: '10px', fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center' }}>
                        No users found
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="form-group">
            <label className="invite-label" style={{ marginBottom: '0.8rem' }}>Project Role</label>
            <div>
              <CustomDropdown 
                currentValue={intendedRole}
                options={['DEVELOPER', 'SCRUM_MASTER', 'PRODUCT_OWNER', 'VIEWER']}
                onChange={(newRole) => setIntendedRole(newRole)}
              />
            </div>
          </div>

          {status.message && (
            <div className={`invite-status-msg ${status.type === 'error' ? 'invite-status-error' : 'invite-status-success'}`}>
              {status.message}
            </div>
          )}

          <div className="invite-action-group">
            <button 
              type="button" 
              onClick={() => {
                setSearchQuery('');
                setSelectedUser(null);
                setStatus({ type: '', message: '' });
                onClose();
              }} 
              disabled={isSubmitting}
              className="invite-cancel-btn"
            >
              Cancel
            </button>
            <button 
              type="submit" 
              disabled={isSubmitting || !selectedUser}
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