import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import '../styling/HomePage.css';

// --- HELPER COMPONENTS ---
const StatusTag = ({ status }) => {
  const statusClass = status.toLowerCase().replace(' ', '-');
  return (
    <div className={`tag tag-status status-${statusClass}`}>
      <span className="dot"></span>{status}
    </div>
  );
};

const PriorityTag = ({ priority }) => {
  const priorityClass = priority.toLowerCase();
  return (
    <div className={`tag tag-priority priority-${priorityClass}`}>
      <span className="flag"></span>{priority}
    </div>
  );
};

const TypeTag = ({ type }) => {
  const typeClass = type.toLowerCase();
  return (
    <div className={`tag tag-type type-${typeClass}`}>
      <span className="icon"></span>{type}
    </div>
  );
};

// --- MAIN COMPONENT ---
const HomePage = () => {
  const { projectId } = useParams();
  // UI States
  const [isDropdownOpen, setIsDropdownOpen] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Data States
  const [tasks, setTasks] = useState([]); // Starts empty, waits for API
  const [editingId, setEditingId] = useState(null); 
  
  // Form States
  const [formData, setFormData] = useState({
    description: '',
    status: 'To do',
    priority: 'Medium',
    type: 'Task'
  });
  const [formErrors, setFormErrors] = useState({});

  // --- 1. READ: FETCH TASKS FROM API ---
  useEffect(() => {
    const fetchTasks = async () => {
      try {
        const token = localStorage.getItem('sprintSightToken');
        
        // Replace with your actual GET endpoint
        const response = await fetch('http://localhost:5000/api/projects/${projectId}/tasks', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}` 
          }
        });

        if (response.ok) {
          const realTasks = await response.json();
          setTasks(realTasks); 
        } else {
          console.error("Failed to fetch tasks. Token might be invalid.");
        }
      } catch (error) {
        console.error("Network error while fetching tasks:", error);
      }
    };

    fetchTasks();
  }, [projectId]);

  // --- MODAL CONTROLS ---
  const openModal = (task = null) => {
    if (task) {
      setFormData(task);
      setEditingId(task.id); // If editing, save the ID
    } else {
      setFormData({ description: '', status: 'To do', priority: 'Medium', type: 'Task' });
      setEditingId(null); // If new, ensure ID is null
    }
    setFormErrors({}); 
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
  };

  // --- 2. CREATE & UPDATE: SAVE TO API ---
  const handleSaveTask = async (e) => {
    e.preventDefault();
    
    // Client-Side Validation
    const errors = {};
    if (!formData.description.trim()) {
      errors.description = "Task description is required.";
    } else if (formData.description.trim().length < 5) {
      errors.description = "Description must be at least 5 characters long.";
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return; 
    }

    try {
      const token = localStorage.getItem('sprintSightToken');

      if (editingId) {
        // UPDATE Existing Task (PUT Request)
        const response = await fetch(`http://localhost:5000/api/tasks/${editingId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(formData)
        });

        if (response.ok) {
          const updatedTask = await response.json();
          // Update the specific task in our local screen list
          setTasks(tasks.map(t => (t.id === editingId ? updatedTask : t)));
        }
      } else {
        // CREATE New Task (POST Request)
        const response = await fetch('http://localhost:5000/api/projects/${projectId}/tasks', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(formData)
        });

        if (response.ok) {
          const newTask = await response.json();
          // Add the brand new task to our local screen list
          setTasks([...tasks, newTask]);
        }
      }
      closeModal();
    } catch (error) {
      console.error("Error saving task to API:", error);
    }
  };

  // --- 3. DELETE: REMOVE FROM API ---
  const handleDelete = async (id) => {
    // Optional: Add a simple confirmation popup before deleting
    if (!window.confirm("Are you sure you want to delete this task?")) return;

    try {
      const token = localStorage.getItem('sprintSightToken');
      
      const response = await fetch(`http://localhost:5000/api/tasks/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        // Remove it from the screen only if the database deletion was successful
        setTasks(tasks.filter(t => t.id !== id));
      }
    } catch (error) {
      console.error("Error deleting task from API:", error);
    }
  };

  return (
    <div className="homepage-wrapper">
      {/* 1. Full-Width Header */}
      <header className="header">
        <div className="header-left">
          <div className="header-logo-container">
            <img src="/sprint-sight-logo.png" alt="Sprint Sight Logo" className="header-logo-img" onError={(e) => { e.target.onerror = null; // <-- THIS IS THE MAGIC LINE! It stops the loop.
                                                                                                                   /*  e.target.src = 'https://via.placeholder.com/100x100?text=Logo'; */ }} />
          </div>
          <h1 className="app-title">Sprint Sight</h1>
        </div>
        <div className="header-center">
          <div className="search-bar-container">
            <span className="search-icon">🔍</span>
            <input type="search" placeholder="Search" className="search-input" />
          </div>
        </div>
        <div className="header-right">
          <div className="header-action-icons">
            <span className="icon-info">ⓘ</span>
            <span className="icon-notification">🔔</span>
          </div>
          <div className="user-profile-icon"><span className="user-initial">P</span></div>
        </div>
      </header>

      {/* 2. Main Body with Sidebar and Content */}
      <div className="main-container">
        
        {/* A. Left Sidebar */}
        <aside className="sidebar">
          <div className="sidebar-top">
            <button className="project-selector" onClick={() => setIsDropdownOpen(!isDropdownOpen)}>
              <span className="project-name">Project 1</span>
              <span className={`dropdown-arrow ${isDropdownOpen ? 'open' : ''}`}>▼</span>
            </button>
            <div className={`project-dropdown-menu ${isDropdownOpen ? 'show' : ''}`}>
              <nav className="sidebar-nav">
                <ul>
                  <li><button className="nav-item"><span className="nav-icon">☰</span><span className="nav-text">Backlog</span></button></li>
                  <li><button className="nav-item"><span className="nav-icon">⚏</span><span className="nav-text">Board</span></button></li>
                  <li><button className="nav-item"><span className="nav-icon">📅</span><span className="nav-text">Calender</span></button></li>
                  <li><button className="nav-item"><span className="nav-icon">↟</span><span className="nav-text">Timeline</span></button></li>
                </ul>
              </nav>
            </div>
          </div>
          <div className="sidebar-bottom">
            <nav className="sidebar-nav-bottom">
              <ul>
                <li><button className="nav-item"><span className="nav-icon">👥</span><span className="nav-text">Teams</span></button></li>
                <li><button className="nav-item"><span className="nav-icon">⚙</span><span className="nav-text">Settings</span></button></li>
              </ul>
            </nav>
          </div>
        </aside>

        {/* B. Main Content Area */}
        <main className="content-area">
          <div className="content-container">
            <div className="content-header">
              <h1 className="page-title">Backlog</h1>
              <div className="user-story-count-container">
                <span className="count-text">{tasks.length} User stories</span>
                <button className="plus-btn" onClick={() => openModal()}>+</button>
              </div>
            </div>

            <div className="content-table">
              <div className="table-header-row">
                <span className="col-status">Status</span>
                <span className="col-priority">Priority</span>
                <span className="col-type">Type</span>
                <span className="col-actions">Actions</span>
              </div>
              
              <div className="task-list">
                {tasks.map(task => (
                  <div key={task.id} className="task-card">
                    <p className="task-description">{task.description}</p>
                    <div className="task-data-section">
                      <StatusTag status={task.status} />
                      <PriorityTag priority={task.priority} />
                      <TypeTag type={task.type} />
                      
                      <div className="task-actions">
                        <button className="action-btn edit-btn" title="Edit Task" onClick={() => openModal(task)}>✏️</button>
                        <button className="action-btn delete-btn" title="Delete Task" onClick={() => handleDelete(task.id)}>🗑️</button>
                      </div>
                    </div>
                  </div>
                ))}
                
                {tasks.length === 0 && (
                  <p style={{ textAlign: 'center', color: '#888', marginTop: '2rem' }}>Loading tasks or no tasks found. Click + to add one!</p>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* --- TASK MODAL OVERLAY --- */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2 className="modal-title">{editingId ? 'Edit Task' : 'Add New Task'}</h2>
            
            <form className="modal-form" onSubmit={handleSaveTask}>
              <div className="form-group">
                <label>Description</label>
                <input 
                  type="text" 
                  value={formData.description} 
                  onChange={(e) => {
                    setFormData({...formData, description: e.target.value});
                    if (formErrors.description) setFormErrors({...formErrors, description: null});
                  }} 
                  placeholder="e.g., create login page" 
                  className={`modal-input ${formErrors.description ? 'input-error' : ''}`}
                />
                {formErrors.description && <span className="error-text">{formErrors.description}</span>}
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Status</label>
                  <select value={formData.status} onChange={(e) => setFormData({...formData, status: e.target.value})} className="modal-input">
                    <option value="To do">To do</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Completed">Completed</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Priority</label>
                  <select value={formData.priority} onChange={(e) => setFormData({...formData, priority: e.target.value})} className="modal-input">
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                    <option value="Critical">Critical</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Type</label>
                  <select value={formData.type} onChange={(e) => setFormData({...formData, type: e.target.value})} className="modal-input">
                    <option value="Task">Task</option>
                    <option value="Bug">Bug</option>
                    <option value="Feature">Feature</option>
                  </select>
                </div>
              </div>

              <div className="modal-actions">
                <button type="button" className="modal-btn cancel-btn" onClick={closeModal}>Cancel</button>
                <button type="submit" className="modal-btn save-btn">Save Task</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default HomePage;