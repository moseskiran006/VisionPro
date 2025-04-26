// src/Dashboard.js
import React from 'react';
import './Dashboard.css';
import { Link } from 'react-router-dom'
import { Card, CardBody, CardTitle } from 'react-bootstrap';
import { useNavigate } from "react-router-dom";

const Dashboard = () => {
  const navigate = useNavigate()
  return (
    <div className="dashboard">
      <aside className="sidebar">
        <h2 className="logo">Vision Pro</h2>
        <ul className="sidebar-menu">
          <li> <button onClick={() => navigate("/home")}>Home</button></li>
          <li> <button onClick={() => navigate("/Livecam")}>LiveCam</button></li>
          <li> <button onClick={() => navigate("/Services")}>Services</button></li>
          <li> <button onClick={() => navigate("/Events")}>Events</button></li>
          
        </ul>
        <footer>Powered by D&W<br />Version 1.0.0</footer>
      </aside>
      <main className="content">
        <header className="topbar">
          <span className="title" >Home</span>
          <div className="user-info">
            <span className="notification-icon">🔔</span>
            <span className="user-avatar">👤</span>
            <span className="email">madhavkartheekbhumireddy@gmail.com</span>
          </div>
          
        </header>
        <section className="cards">
        <div className="card animate">
            <h3 className='Title' onClick={() => navigate("/Events")}>🗓️ Events</h3>
            <p>Events Detected - <span>0</span></p>
          </div>
          
          <div className="card animate">
            <h3 className='Title' onClick={() => navigate("/Services")}>🛠️Services</h3>
            <p>Services Added - <span>0</span></p>
          </div>
          
          
          <div className="card animate">
            <h3 className='Title' onClick={() => navigate("/Livecam")}>🎦Livecam</h3>
            <p>Livecam Added - <span>0</span></p>
          </div>
        </section>
        <section className="summary">
          <div className="summary-card animate">
            <h4 className='Summary-head'>Event Summary</h4>
            <img src="./src/Gif.gif" alt="placeholder icon" className="placeholder-icon" />
            <div className="placeholder">No Events Found</div>
          </div>
          <div className="summary-card animate">

            <h4 className='Summary-head'> Livecam Summary</h4>
            <img src="./src/Gif.gif" alt="placeholder icon" className="placeholder-icon" />
            <div className="placeholder">No Cameras are Added</div>
          </div>
        </section>
      </main>
    </div>
  );
};

export default Dashboard;
