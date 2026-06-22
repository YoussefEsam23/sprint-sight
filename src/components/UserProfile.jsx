import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import '../styling/UserProfile.css'; 
import UserProfilePicture from './UserProfilePicture'; 

const UserProfile = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();

  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem('sprintSightUser');
    return stored ? JSON.parse(stored) : null;
  });
  
  const initial = user?.username ? user.username.charAt(0).toUpperCase() : 'U';
  
  // --- THE FIX: Look for either key from the backend! ---
  const userImage = user?.profilePictureUrl || user?.imageUrl;

  const [formData, setFormData] = useState({
    fullName: user?.fullName || '',
    email: user?.email || '',
    username: user?.username || '',
    password: ''
  });

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getCookie = (name) => {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
    return null;
  };

  const handleSaveSettings = async () => {
    try {
      const response = await fetch(`/api/users/${user.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('sprintSightToken')}`,
          'X-XSRF-TOKEN': getCookie('XSRF-TOKEN'),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          fullName: formData.fullName,
          email: formData.email,
          username: formData.username,
          password: formData.password || undefined 
        })
      });

      if (response.ok) {
        alert("Profile updated successfully!");
        const updatedUser = { ...user, ...formData };
        localStorage.setItem('sprintSightUser', JSON.stringify(updatedUser));
        setUser(updatedUser); 
        setIsSettingsModalOpen(false);
      } else {
        alert("Failed to update profile.");
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handleDeleteAccount = async () => {
    if (!window.confirm("Are you sure? This cannot be undone!")) return;
    try {
      await fetch(`/api/users/${user.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('sprintSightToken')}`,
          'X-XSRF-TOKEN': getCookie('XSRF-TOKEN')
        }
      });
      localStorage.clear();
      navigate('/login');
    } catch (error) {
      alert("Error deleting account.");
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('sprintSightToken')}` }
      });
    } finally {
      localStorage.clear();
      navigate('/login');
    }
  };

  return (
    <div className="up-wrapper" ref={dropdownRef}>
      
      {/* --- NAVBAR AVATAR --- */}
      <button 
        className="up-nav-btn" 
        onClick={() => setIsOpen(!isOpen)}
        style={{ padding: userImage ? 0 : '', overflow: 'hidden' }}
      >
        {userImage ? (
          <img src={userImage} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          initial
        )}
      </button>

      {isOpen && (
        <div className="up-menu">
          <div className="up-menu-header">
            
            {/* --- DROPDOWN AVATAR --- */}
            <div className="up-avatar-large" style={{ overflow: 'hidden' }}>
              {userImage ? (
                <img src={userImage} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                initial
              )}
            </div>

            <div className="up-user-info">
              <span className="up-fullname">{user?.fullName}</span>
              <span className="up-email">{user?.email}</span>
            </div>
          </div>
          <div className="up-menu-list">
            <button className="up-menu-btn" onClick={() => { setIsOpen(false); setIsSettingsModalOpen(true); }}>
              ⚙️ Account Settings
            </button>
            <button className="up-menu-btn up-logout-btn" onClick={handleLogout}>
              🚪 Logout
            </button>
          </div>
        </div>
      )}

      {isSettingsModalOpen && createPortal(
        <div className="up-modal-overlay">
          <div className="up-modal-box">
            <h2>Account Settings</h2>

            <UserProfilePicture 
              user={user} 
              onPictureUpdate={(updatedUser) => {
                setFormData({
                  ...formData,
                  fullName: updatedUser.fullName,
                  email: updatedUser.email,
                  username: updatedUser.username
                });
                setUser(updatedUser); 
              }} 
            />
            
            <div className="up-input-group">
              <label>Full Name</label>
              <input value={formData.fullName} onChange={e => setFormData({...formData, fullName: e.target.value})} />
            </div>

            <div className="up-input-group">
              <label>Email Address</label>
              <input value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
            </div>

            <div className="up-input-row">
              <div className="up-input-group">
                <label>Username</label>
                <input value={formData.username} onChange={e => setFormData({...formData, username: e.target.value})} />
              </div>

              <div className="up-input-group">
                <label>New Password</label>
                <input type="password" placeholder="Leave blank to keep" onChange={e => setFormData({...formData, password: e.target.value})} />
              </div>
            </div>
            
            <div className="up-modal-footer">
              <button className="up-btn-delete btn-hover-effect" onClick={handleDeleteAccount}>Delete Account</button>
              
              <div className="up-footer-right">
                <button className="up-btn-cancel btn-hover-effect" onClick={() => setIsSettingsModalOpen(false)}>Cancel</button>
                <button className="up-btn-save btn-hover-effect" onClick={handleSaveSettings}>Save Changes</button>
              </div>
            </div>

          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default UserProfile;