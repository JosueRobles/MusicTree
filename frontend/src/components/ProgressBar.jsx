import React from 'react';
import './ProgressBar.css';

const ProgressBar = ({ progreso }) => {
  return (
    <div className="progress-bar">
      <div
        className="progress-bar-fill"
        style={{ width: `${progreso}%` }}
      ></div>
    </div>
  );
};

export default ProgressBar;