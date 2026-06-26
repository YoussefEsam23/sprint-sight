import React, { useState, useRef, useEffect } from 'react';
import '../styling/MultiSelectDropdown.css'; 

const MultiSelectDropdown = ({ currentValues = [], options = [], onChange, placeholder = "Select..." }) => {
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
      ? currentValues.filter(v => v !== value)
      : [...currentValues, value];
    onChange(newValues);
  };

  const getDisplayText = () => {
    if (currentValues.length === 0) return placeholder;
    if (currentValues.length === 1) {
      const selected = options.find(o => o.value === currentValues[0]);
      return selected ? selected.label : placeholder;
    }
    return `${currentValues.length} selected`;
  };

  return (
    <div className="msd-container" ref={dropdownRef}>
      <button type="button" className="msd-button" onClick={() => setIsOpen(!isOpen)}>
        <span>{getDisplayText()}</span> <span>▼</span>
      </button>

      {isOpen && (
        <div className="msd-menu">
          {options.length === 0 ? (
            <div className="msd-empty">No options available</div>
          ) : (
            options.map((option) => (
              <div
                key={option.value}
                className="msd-item"
                onClick={(e) => { e.stopPropagation(); toggleOption(option.value); }}
              >
                <input 
                  type="checkbox" 
                  className="msd-checkbox"
                  checked={currentValues.includes(option.value)}
                  onChange={() => {}} 
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