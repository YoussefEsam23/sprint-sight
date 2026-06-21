import React, { useState, useRef, useEffect } from 'react';
import '../styling/CustomDropdown.css'; // Make sure this path is correct for your folders!

const CustomDropdown = ({ currentValue, options, onChange, readOnlyLabel }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Magic click-outside listener to automatically close the menu!
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (option) => {
    onChange(option);
    setIsOpen(false); // Close menu after picking an option
  };

  return (
    <div className="custom-dropdown-container" ref={dropdownRef}>
      <button
        type="button"
        className="custom-dropdown-button"
        onClick={() => setIsOpen(!isOpen)}
      >
        {currentValue.replace('_', ' ')} <span className="dropdown-arrow">▼</span>
      </button>

      {isOpen && (
        <div className="custom-dropdown-menu">
          {/* If they are looking at a role they can't assign, we show it grayed out at the top */}
          {readOnlyLabel && (
            <div className="custom-dropdown-readonly">
              {readOnlyLabel.replace('_', ' ')} (Current)
            </div>
          )}
          
          {/* Loop through all the roles they ARE allowed to assign */}
          {options.map(option => (
            <div
              key={option}
              className="custom-dropdown-item"
              onClick={() => handleSelect(option)}
            >
              {option.replace('_', ' ')}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default CustomDropdown;