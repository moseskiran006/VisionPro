import React from 'react';
import './TopNav.css';

const TopNav = () => {
  return (
    <div className="top-nav">
      <div className="top-nav-item">
        <span className="material-icons">camera</span>
        <span className="material-icons">notifications</span>
        <span className="user-info">madhavkartheekbhumireddy@gmail.com</span>
      </div>
    </div>
  );
};

export default TopNav;
