import React, { useState, useEffect } from 'react';
import '../styling/IssueComments.css';

const IssueComments = ({ issueId, currentUserRole }) => {
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editContent, setEditContent] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const storedUser = JSON.parse(localStorage.getItem('sprintSightUser')) || {};
  const currentUserId = storedUser.id;

  const canComment = ['CREATOR', 'PRODUCT_OWNER', 'SCRUM_MASTER', 'DEVELOPER'].includes(currentUserRole);

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

  const fetchComments = async () => {
    try {
      const response = await fetch(`/api/issues/${issueId}/comments`, { headers: getAuthHeaders() });
      if (response.ok) {
        const data = await response.json();
        setComments(data.data || []);
      }
    } catch (error) {
      console.error("Failed to fetch comments", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (issueId) fetchComments();
  }, [issueId]);

  const handleAddComment = async () => {
    if (!newComment.trim()) return;
    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/issues/${issueId}/comments`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ content: newComment })
      });
      if (response.ok) {
        setNewComment('');
        fetchComments();
      } else {
        alert("Failed to post comment. Check your permissions.");
      }
    } catch (error) {
      console.error("Failed to post comment", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateComment = async (commentId) => {
    if (!editContent.trim()) return;
    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/issues/${issueId}/comments/${commentId}`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({ content: editContent })
      });
      if (response.ok) {
        setEditingId(null);
        fetchComments();
      }
    } catch (error) {
      console.error("Failed to update comment", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteComment = async (commentId) => {
    if (!window.confirm("Are you sure you want to delete this comment?")) return;
    try {
      const response = await fetch(`/api/issues/${issueId}/comments/${commentId}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });
      if (response.ok) {
        fetchComments();
      }
    } catch (error) {
      console.error("Failed to delete comment", error);
    }
  };

  const formatDate = (isoString) => {
    const date = new Date(isoString);
    return date.toLocaleDateString() + ' at ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  if (isLoading) return <div className="ic-loading-text">Loading comments...</div>;

  return (
    <div className="ic-container">
      <h3 className="ic-header">Discussion ({comments.length})</h3>

      <div className="ic-list">
        {comments.map(comment => {
          const isMyComment = comment.author.id === currentUserId;
          const authorImage = comment.author.profilePictureUrl || comment.author.imageUrl;
          
          return (
            <div key={comment.id} className="ic-card">
              
              <div className={`ic-avatar ${authorImage ? 'ic-avatar-has-img' : ''}`}>
                {authorImage ? (
                  <img src={authorImage} alt="Profile" className="ic-avatar-img" />
                ) : (
                  comment.author.username.charAt(0).toUpperCase()
                )}
              </div>

              <div className="ic-body">
                <div className="ic-meta">
                  <span className="ic-author">{comment.author.fullName || comment.author.username}</span>
                  <span className="ic-date">
                    {formatDate(comment.createdAt)} {comment.updatedAt > comment.createdAt && '(edited)'}
                  </span>
                </div>
                
                {editingId === comment.id ? (
                  <div className="ic-input-wrapper">
                    <textarea 
                      className="ic-textarea" 
                      value={editContent} 
                      onChange={(e) => setEditContent(e.target.value)} 
                    />
                    <div className="ic-edit-actions">
                      <button type="button" className="ic-action-btn" onClick={() => setEditingId(null)}>Cancel</button>
                      <button type="button" className="ic-submit-btn" disabled={isSubmitting} onClick={() => handleUpdateComment(comment.id)}>
                        {isSubmitting ? 'Saving...' : 'Save'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <p className="ic-text">{comment.content}</p>
                    {isMyComment && (
                      <div className="ic-actions">
                        <button type="button" className="ic-action-btn" onClick={() => { setEditingId(comment.id); setEditContent(comment.content); }}>Edit</button>
                        <button type="button" className="ic-action-btn ic-delete-btn" onClick={() => handleDeleteComment(comment.id)}>Delete</button>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          );
        })}
        {comments.length === 0 && <p className="ic-empty-text">No comments yet. Start the discussion!</p>}
      </div>

      {canComment ? (
        <div className="ic-input-wrapper">
          <textarea 
            className="ic-textarea" 
            placeholder="Add a comment..." 
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
          />
          <button 
            type="button"
            className="ic-submit-btn" 
            disabled={!newComment.trim() || isSubmitting}
            onClick={handleAddComment}
          >
            {isSubmitting ? 'Posting...' : 'Post Comment'}
          </button>
        </div>
      ) : (
        <div className="ic-no-permission-msg">
          You are viewing this project as a Viewer and cannot post comments.
        </div>
      )}
    </div>
  );
};

export default IssueComments;