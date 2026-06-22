import React, { useRef, useState } from 'react';
import '../styling/UserProfilePicture.css';

const UserProfilePicture = ({ user, onPictureUpdate }) => {
  const fileInputRef = useRef(null);
  const [isUploading, setIsUploading] = useState(false);

  const initial = user?.username ? user.username.charAt(0).toUpperCase() : 'U';

  const getCookie = (name) => {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
    return null;
  };

  const handleAvatarClick = () => {
    fileInputRef.current.click();
  };

  const handleFileChange = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setIsUploading(true);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch(`/api/users/${user.id}/profile-picture`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('sprintSightToken')}`,
          'X-XSRF-TOKEN': getCookie('XSRF-TOKEN')
          // Remember: DO NOT set Content-Type for FormData!
        },
        body: formData
      });

      if (response.ok) {
        const result = await response.json();
        const newImageUrl = result.data.imageUrl; 
        
        const updatedUser = { ...user, imageUrl: newImageUrl };
        localStorage.setItem('sprintSightUser', JSON.stringify(updatedUser));
        onPictureUpdate(updatedUser);
      } else {
        alert("Failed to upload image.");
      }
    } catch (error) {
      console.error("Upload error:", error);
      alert("Network error during upload.");
    } finally {
      setIsUploading(false);
      event.target.value = ''; 
    }
  };

  const handleDeletePicture = async () => {
    if (!window.confirm("Remove profile picture?")) return;
    setIsUploading(true);

    try {
      const response = await fetch(`/api/users/${user.id}/profile-picture`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('sprintSightToken')}`,
          'X-XSRF-TOKEN': getCookie('XSRF-TOKEN')
        }
      });

      if (response.ok) {
        const updatedUser = { ...user, imageUrl: null };
        localStorage.setItem('sprintSightUser', JSON.stringify(updatedUser));
        onPictureUpdate(updatedUser);
      } else {
        alert("Failed to delete image.");
      }
    } catch (error) {
      console.error("Delete error:", error);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="upp-container">
      <input 
        type="file" 
        accept="image/png, image/jpeg, image/jpg" 
        ref={fileInputRef} 
        style={{ display: 'none' }} 
        onChange={handleFileChange}
      />

      <div className="upp-avatar-wrapper" onClick={handleAvatarClick}>
        {user?.imageUrl ? (
          <img src={user.imageUrl} alt="Profile" className="upp-image" />
        ) : (
          <div className="upp-fallback">{initial}</div>
        )}
        
        <div className="upp-overlay">
          <span>📷 Edit</span>
        </div>
      </div>

      {isUploading && <div className="upp-loading">Uploading...</div>}

      {user?.imageUrl && !isUploading && (
        <div className="upp-actions">
          <button type="button" className="upp-delete-btn" onClick={handleDeletePicture}>
            Remove Picture
          </button>
        </div>
      )}
    </div>
  );
};

export default UserProfilePicture;