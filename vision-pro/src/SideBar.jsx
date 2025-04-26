import React from 'react';
import './Dashboard.css';
import { Link } from 'react-router-dom'

const SideBar = () => {
  return (
    <div className="dashboard">
      <aside className="sidebar">
        <h2 className="logo">AM Global</h2>
        <ul className="sidebar-menu">
          <li> <Link to='./'>Home</Link></li>
          <li><Link to='./Livecam'>Livecam</Link></li>
          <li>Services</li>
          <li>Events</li>
          <li>Analytics</li>
          <li>Organization</li>
          <li>Settings</li>
        </ul>
        <footer>Powered by D&W<br />Version 1.0.0</footer>
      </aside>
      </div>
  );
};

export default SideBar;