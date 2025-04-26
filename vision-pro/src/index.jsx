import React, { useRef, useEffect, useState } from 'react';
import Card from 'react-bootstrap/Card';
import Button from 'react-bootstrap/Button';
import './Livecam.css';


const Livecam = () => {
  const videoRef = useRef(null);
  const [cameraAccess, setCameraAccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const enableCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        videoRef.current.srcObject = stream;
        setCameraAccess(true);
      } catch (err) {
        console.error("Error accessing camera:", err);
        setErrorMessage("Unable to access the camera. Please check your browser settings.");
        setCameraAccess(false);
      }
    };

    enableCamera();

    return () => {
      if (videoRef.current && videoRef.current.srcObject) {
        videoRef.current.srcObject.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  return (
    <div className="livecam-container">
      <div className="sidebar">
        <h2>Livecam</h2>
        <Button variant="dark" className="add-camera-btn">+ Add LiveCam</Button>
        <input
          type="text"
          placeholder="Search by camera and group"
          className="search-input"
        />
        <Button variant="light" className="filter-btn">Filter</Button>
      </div>
      <div className="content-area">
        <Card className="livecam-card">
          <Card.Body>
            <Card.Title>Live Camera</Card.Title>
            <div className="video-container">
              {cameraAccess ? (
                <video ref={videoRef} autoPlay playsInline className="live-video"></video>
              ) : (
                <p>{errorMessage || "Camera access denied or unavailable."}</p>
              )}
            </div>
            <Button variant="primary" onClick={() => window.location.reload()}>
              Refresh Camera
            </Button>
          </Card.Body>
        </Card>
      </div>
    </div>
  );
};

export default Livecam;
