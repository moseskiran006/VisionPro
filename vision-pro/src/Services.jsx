import React from 'react';
import { ProgressBar, Button, Row, Col, Card } from 'react-bootstrap';
import './Services.css';
import { useNavigate } from "react-router-dom";
import './Livecam.css';
import './Dashboard.css';


const Services = () => {
  const navigate = useNavigate();
  return (
    <div className="app-container">
      {/* Sidebar */}
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
      
      {/* Main Content */}
      <div className="main-content">
        {/* Top Navbar */}
        <header className="topbar">
          <span className="title" onClick={() => navigate("/home")}>Home</span>
          <div className="user-info">
            <span className="notification-icon">🔔</span>
            <span className="user-avatar">👤</span>
            <span className="email">madhavkartheekbhumireddy@gmail.com</span>
          </div>
        </header>

        <div className="services-container">
        <Row className="justify-content-center mt-4">
            <Button className="add-service-button">+ Add Service</Button>
          </Row>
          <Row className="justify-content-center mt-4">
            <div className="no-details">
              <img src="./src/Gif.gif" alt="placeholder icon" className="placeholder-icon" />
              <p>No details were found. Once you add a service, all the information will appear here.</p>
            </div>
          </Row>
        </div>
        {/* Services Content
        <div className="services-container">
          <Row className="progress-bars">
            <Col md={4}>
              <Card className="service-card">
                <Card.Body>
                  <Card.Title className="progress-title">Cpu Utilization</Card.Title>
                  <ProgressBar now={1.4} label={`${1.4}%`} className="custom-progress cpu-progress" />
                </Card.Body>
              </Card>
            </Col> */}

            {/* RAM Utilization
            <Col md={4}>
              <Card className="service-card">
                <Card.Body>
                  <Card.Title className="progress-title">Ram Utilization</Card.Title>
                  <ProgressBar now={31.2} label={`${31.2}%`} className="custom-progress ram-progress" />
                </Card.Body>
              </Card>
            </Col> */}

            {/* Memory Utilization
            <Col md={4}>
              <Card className="service-card">
                <Card.Body>
                  <Card.Title className="progress-title">Memory Utilization</Card.Title>
                  <ProgressBar now={27.52} label={`${27.52}%`} className="custom-progress memory-progress" />
                </Card.Body>
              </Card>
            </Col>
          </Row> */}
        </div>
      </div>
  );
};

export default Services;
