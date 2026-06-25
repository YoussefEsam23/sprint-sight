import React, { useState, useRef, useEffect } from 'react';
import '../styling/CustomDropdown.css'; 

const MultiSelectDropdown = ({ currentValues = [], options = [], onChange, placeholder = "Select components..." }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleOption = (value) => {
    const newValues = currentValues.includes(value)
      ? currentValues.filter(v => v !== value) // Remove if already selected
      : [...currentValues, value]; // Add if not selected
    
    onChange(newValues);
  };

  // Determine what text to show on the button
  const getDisplayText = () => {
    if (currentValues.length === 0) return placeholder;
    if (currentValues.length === 1) {
      const selected = options.find(o => o.value === currentValues[0]);
      return selected ? selected.label : placeholder;
    }
    return `${currentValues.length} selected`;
  };

  return (
    <div className="custom-dropdown-container" ref={dropdownRef} style={{ width: '100%', position: 'relative' }}>
      <button
        type="button"
        className="custom-dropdown-button"
        onClick={() => setIsOpen(!isOpen)}
        style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
      >
        <span>{getDisplayText()}</span> <span className="dropdown-arrow">▼</span>
      </button>

      {isOpen && (
        <div 
          className="custom-dropdown-menu" 
          style={{ 
            width: '100%', position: 'absolute', top: '100%', left: 0,
            zIndex: 99999, backgroundColor: 'var(--bg-card)', 
            border: '1px solid var(--border-color)', borderRadius: '8px',
            boxShadow: '0 10px 30px rgba(0,0,0,0.6)', marginTop: '4px',
            maxHeight: '220px', overflowY: 'auto'
          }}
        >
          {options.length === 0 ? (
            <div style={{ padding: '10px 12px', color: 'var(--text-muted)' }}>
              No options available
            </div>
          ) : (
            options.map((option) => (
              <div
                key={option.value}
                className="custom-dropdown-item"
                onClick={(e) => {
                  e.stopPropagation(); // Prevent closing when clicking a checkbox
                  toggleOption(option.value);
                }}
                style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
              >
                <input 
                  type="checkbox" 
                  checked={currentValues.includes(option.value)}
                  onChange={() => {}} // Handled by parent div click
                  style={{ cursor: 'pointer', accentColor: 'var(--accent-color)' }}
                />
                {option.label}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default MultiSelectDropdown;