import React, { useState, useRef, useEffect } from 'react';
import '../styling/CustomDropdown.css'; 

const CustomDropdown = ({ currentValue, options, onChange, readOnlyLabel }) => {
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

  const handleSelect = (option) => {
    onChange(typeof option === 'object' ? option.value : option);
    setIsOpen(false); 
  };

  const getLabel = (opt) => {
    if (!opt) return 'Select...';
    if (typeof opt === 'object') return opt.label;
    return String(opt).replace(/_/g, ' '); 
  };

  const getValue = (opt) => {
    if (typeof opt === 'object') return opt.value;
    return opt;
  };

  let displayValue = 'Select...';
  if (currentValue) {
    if (typeof currentValue === 'object') {
      displayValue = currentValue.label;
    } else {
      const matchedObj = options.find(o => typeof o === 'object' && o.value === currentValue);
      displayValue = matchedObj ? matchedObj.label : String(currentValue).replace(/_/g, ' ');
    }
  }

  return (
    <div className="custom-dropdown-container" ref={dropdownRef}>
      <button
        type="button"
        className="custom-dropdown-button"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span>{displayValue}</span> <span className="dropdown-arrow">▼</span>
      </button>

      {isOpen && (
        <div className="custom-dropdown-menu">
          {readOnlyLabel && (
            <div className="custom-dropdown-readonly">
              {getLabel(readOnlyLabel)} (Current)
            </div>
          )}
          
          {options.length === 0 ? (
            <div className="custom-dropdown-empty">
              No options available
            </div>
          ) : (
            options.map((option, index) => (
              <div
                key={getValue(option) || index}
                className="custom-dropdown-item"
                onClick={() => handleSelect(option)}
              >
                {getLabel(option)}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default CustomDropdown;