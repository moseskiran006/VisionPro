import React, { useState, useEffect, useCallback } from 'react';
import { Button, Form, Card, Row, Col, Badge, Alert, Spinner } from "react-bootstrap";
import { useNavigate } from 'react-router-dom';
import "./App.css";
import "./Livecam.css";
import "./Dashboard.css";
import "./detection.css";

const LiveCam = () => {
  const navigate = useNavigate();

  // State variables
  const [showLiveCam, setShowLiveCam] = useState(false);
  const [plateDetectionResults, setPlateDetectionResults] = useState([]);
  const [objectCounts, setObjectCounts] = useState({});
  const [loading1, setLoading1] = useState(false);
  const [loading2, setLoading2] = useState(false);
  const [processedImage1, setProcessedImage1] = useState(null);
  const [processedImage2, setProcessedImage2] = useState(null);
  const [lastDetectionTime1, setLastDetectionTime1] = useState(null);
  const [lastDetectionTime2, setLastDetectionTime2] = useState(null);
  const [isAutoDetecting1, setIsAutoDetecting1] = useState(false);
  const [isAutoDetecting2, setIsAutoDetecting2] = useState(false);
  const [cameraUrl1, setCameraUrl1] = useState("");
  const [cameraUrl2, setCameraUrl2] = useState("");
  const [error1, setError1] = useState(null);
  const [error2, setError2] = useState(null);
  const [detectionStats1, setDetectionStats1] = useState({ total: 0, successful: 0 });
  const [detectionStats2, setDetectionStats2] = useState({ total: 0, successful: 0 });

  // URL validation
  const validateCameraUrl = useCallback((url) => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }, []);

  // Handle camera URL changes
  const handleCameraUrlChange = useCallback((url, setCameraUrl, setError) => {
    if (url === "" || validateCameraUrl(url)) {
      setCameraUrl(url);
      setError(null);
    } else {
      setError("Invalid camera URL format");
    }
  }, [validateCameraUrl]);

  // Plate Detection Function
  const detectPlates = async () => {
    if (loading2) {
      setError1("Please wait for object detection to complete");
      return;
    }

    if (!cameraUrl1) {
      setError1("Please enter a valid camera URL");
      return;
    }

    let retries = 3;
    while (retries > 0) {
      try {
        setLoading1(true);
        setError1(null);

        const response = await fetch(
          `http://127.0.0.1:5000/get-ip-camera-frame/?camera_url=${encodeURIComponent(cameraUrl1)}`,
          {
            method: "GET",
            timeout: 10000,
          }
        );

        if (!response.ok) {
          throw new Error(`API responded with status: ${response.status}`);
        }

        const result = await response.json();

        if (result.success) {
          setProcessedImage1(`data:image/jpeg;base64,${result.image}`);
          
          if (result.plates && result.plates.length > 0) {
            setPlateDetectionResults(result.plates);
            setDetectionStats1(prev => ({
              total: prev.total + 1,
              successful: prev.successful + 1
            }));
          } else {
            setPlateDetectionResults(["No plates detected"]);
            setDetectionStats1(prev => ({
              ...prev,
              total: prev.total + 1
            }));
          }

          if (result.timestamp) {
            setLastDetectionTime1(result.timestamp);
          }

          break;
        } else {
          throw new Error(result.error || "Detection failed");
        }
      } catch (error) {
        console.error(`Detection attempt ${4-retries} failed:`, error);
        retries--;
        
        if (retries === 0) {
          setError1(`Detection failed: ${error.message}`);
          setPlateDetectionResults(["Error: Detection failed"]);
          setDetectionStats1(prev => ({
            ...prev,
            total: prev.total + 1
          }));
        } else {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      } finally {
        if (retries === 0) setLoading1(false);
      }
    }
  };

  // Object Detection Function
  const detectObjects = async () => {
    if (loading1) {
      setError2("Please wait for plate detection to complete");
      return;
    }

    if (!cameraUrl2) {
      setError2("Please enter a valid camera URL");
      return;
    }

    let retries = 3;
    while (retries > 0) {
      try {
        setLoading2(true);
        setError2(null);

        const response = await fetch(
          `http://127.0.0.1:5000/get-ip-camera-frame/?camera_url=${encodeURIComponent(cameraUrl2)}`,
          {
            method: "GET",
            timeout: 10000,
          }
        );

        if (!response.ok) {
          throw new Error(`API responded with status: ${response.status}`);
        }

        const result = await response.json();

        if (result.success) {
          setProcessedImage2(`data:image/jpeg;base64,${result.image}`);
          
          if (result.object_count) {
            setObjectCounts(result.object_count);
            setDetectionStats2(prev => ({
              total: prev.total + 1,
              successful: prev.successful + 1
            }));
          } else {
            setObjectCounts({});
            setDetectionStats2(prev => ({
              ...prev,
              total: prev.total + 1
            }));
          }

          if (result.timestamp) {
            setLastDetectionTime2(result.timestamp);
          }

          break;
        } else {
          throw new Error(result.error || "Detection failed");
        }
      } catch (error) {
        console.error(`Detection attempt ${4-retries} failed:`, error);
        retries--;
        
        if (retries === 0) {
          setError2(`Detection failed: ${error.message}`);
          setObjectCounts({});
          setDetectionStats2(prev => ({
            ...prev,
            total: prev.total + 1
          }));
        } else {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      } finally {
        if (retries === 0) setLoading2(false);
      }
    }
  };

  // Auto-detection effects
  useEffect(() => {
    let interval1;
    if (isAutoDetecting1 && cameraUrl1) {
      interval1 = setInterval(() => {
        if (!loading1) detectPlates();
      }, 1000);
    }
    return () => clearInterval(interval1);
  }, [isAutoDetecting1, loading1, cameraUrl1]);

  useEffect(() => {
    let interval2;
    if (isAutoDetecting2 && cameraUrl2) {
      interval2 = setInterval(() => {
        if (!loading2) detectObjects();
      }, 1000);
    }
    return () => clearInterval(interval2);
  }, [isAutoDetecting2, loading2, cameraUrl2]);

  // Camera Feed Component
  const CameraFeed = ({ 
    processedImage, 
    onDetect, 
    loading, 
    title, 
    buttonText,
    isAutoDetecting,
    setIsAutoDetecting,
    cameraUrl,
    setCameraUrl,
    error,
    stats
  }) => {
    const [showProcessed, setShowProcessed] = useState(false);
    
    useEffect(() => {
      if (processedImage) {
        setShowProcessed(true);
        const timer = setTimeout(() => {
          setShowProcessed(false);
        }, 2000);
        return () => clearTimeout(timer);
      }
    }, [processedImage]);

    return (
      <Card className="mb-4 h-100">
        <Card.Body>
          <Card.Title className="d-flex justify-content-between align-items-center">
            {title}
            <Badge bg="info">
              Success Rate: {stats.total ? ((stats.successful/stats.total) * 100).toFixed(1) : 0}%
            </Badge>
          </Card.Title>
          
          <Form.Group className="mb-3">
            <Form.Control
              type="text"
              placeholder="Enter IP Camera URL"
              value={cameraUrl}
              onChange={(e) => handleCameraUrlChange(
                e.target.value,
                setCameraUrl,
                error === "Invalid camera URL format" ? setError : null
              )}
              isInvalid={!!error}
            />
            <Form.Control.Feedback type="invalid">
              {error}
            </Form.Control.Feedback>
          </Form.Group>

          <div className="video-container mb-3 position-relative">
            {cameraUrl && (
              <img
                src={cameraUrl}
                alt="IP Camera Feed"
                className="webcam-video"
              />
            )}
            {showProcessed && processedImage && (
              <img
                src={processedImage}
                alt="Processed feed"
                className="processed-overlay"
              />
            )}
            {loading && (
              <div className="loading-overlay">
                <Spinner animation="border" variant="light" />
              </div>
            )}
          </div>

          <div className="d-flex gap-2">
            <Button
              variant="primary"
              onClick={onDetect}
              disabled={loading || isAutoDetecting || !cameraUrl}
            >
              {loading ? (
                <>
                  <Spinner
                    as="span"
                    animation="border"
                    size="sm"
                    role="status"
                    aria-hidden="true"
                    className="me-2"
                  />
                  Processing...
                </>
              ) : buttonText}
            </Button>
            <Button
              variant={isAutoDetecting ? "danger" : "success"}
              onClick={() => setIsAutoDetecting(!isAutoDetecting)}
              disabled={!cameraUrl}
            >
              {isAutoDetecting ? "Stop Auto Detection" : "Start Auto Detection"}
            </Button>
          </div>

          {error && !error.includes("URL") && (
            <Alert variant="danger" className="mt-3">
              {error}
            </Alert>
          )}
        </Card.Body>
      </Card>
    );
  };

  // Results Card Component
  const ResultsCard = ({ title, children }) => (
    <Card className="mb-3">
      <Card.Header className="bg-primary text-white">
        <h6 className="mb-0">{title}</h6>
      </Card.Header>
      <Card.Body>{children}</Card.Body>
    </Card>
  );

  return (
    <div className="app-container">
      {/* Sidebar */}
      <aside className="sidebar">
        <h2 className="logo">Vision Pro</h2>
        <ul className="sidebar-menu">
          <li><button onClick={() => navigate("/home")}>Home</button></li>
          <li><button onClick={() => navigate("/Livecam")}>LiveCam</button></li>
          <li><button onClick={() => navigate("/Services")}>Services</button></li>
          <li><button onClick={() => navigate("/Events")}>Analytics</button></li>
        </ul>
        <footer>
          Powered by D&W
          <br />
          Version 1.0.0
        </footer>
      </aside>

      {/* Main Content Area */}
      <div className="main-content">
        <header className="topbar">
          <div className="home">
            <span className="title" onClick={() => navigate("/home")}>Home</span>
          </div>
          <div className="user-info">
            <span className="notification-icon">🔔</span>
            <span className="user-avatar">👤</span>
            <span className="email">madhavkartheekbhumireddy@gmail.com</span>
          </div>
        </header>

        <div className="content-area">
          <div className="content-header">
            <Button
              variant="dark"
              className="add-camera-btn"
              onClick={() => setShowLiveCam(true)}
            >
              + Add LiveCam (IP Camera)
            </Button>
            <Form.Control
              type="text"
              placeholder="Search by camera and group"
              className="search-input"
            />
            <Button variant="light" className="filter-btn">
              Filter
            </Button>
          </div>

          <div className="content-body">
            {showLiveCam ? (
              <Row>
                {/* Left Side - Number Plate Detection */}
                <Col md={6}>
                  <CameraFeed
                    processedImage={processedImage1}
                    onDetect={detectPlates}
                    loading={loading1}
                    title="Number Plate Detection"
                    buttonText="Detect Plates"
                    isAutoDetecting={isAutoDetecting1}
                    setIsAutoDetecting={setIsAutoDetecting1}
                    cameraUrl={cameraUrl1}
                    setCameraUrl={setCameraUrl1}
                    error={error1}
                    stats={detectionStats1}
                  />
                  <ResultsCard title="Detected Plates">
                    {plateDetectionResults.length > 0 ? (
                      <ul className="list-unstyled mb-0">
                        {plateDetectionResults.map((plate, index) => (
                          <li key={index} className="mb-2">
                            <Badge bg="success" className="px-3 py-2">
                              {plate}
                            </Badge>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="mb-0 text-muted">No plates detected</p>
                    )}
                    {lastDetectionTime1 && (
                      <small className="text-muted d-block mt-2">
                        Last Detection: {lastDetectionTime1}
                      </small>
                    )}
                  </ResultsCard>
                </Col>

                {/* Right Side - Object Detection */}
                <Col md={6}>
                  <CameraFeed
                    processedImage={processedImage2}
                    onDetect={detectObjects}
                    loading={loading2}
                    title="Object Detection"
                    buttonText="Detect Objects"
                    isAutoDetecting={isAutoDetecting2}
                    setIsAutoDetecting={setIsAutoDetecting2}
                    cameraUrl={cameraUrl2}
                    setCameraUrl={setCameraUrl2}
                    error={error2}
                    stats={detectionStats2}
                  />
                  <ResultsCard title="Detected Objects">
                    {Object.keys(objectCounts).length > 0 ? (
                      <ul className="list-unstyled mb-0">
                        {Object.entries(objectCounts).map(([object, count]) => (
                          <li key={object} className="mb-2 d-flex justify-content-between align-items-center">
                            <span className="text-capitalize">{object}</span>
                            <Badge bg="primary" pill>
                              {count}
                            </Badge>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="mb-0 text-muted">No objects detected</p>
                    )}
                    {lastDetectionTime2 && (
                      <small className="text-muted d-block mt-2">
                        Last Detection: {lastDetectionTime2}
                      </small>
                    )}
                  </ResultsCard>
                </Col>
              </Row>
            ) : (
              <div className="no-camera-message">
                <i className="bi bi-camera-video-off no-camera-icon"></i>
                <p>No details were found. Once you add a camera, all the information will appear here.</p>
                <Button
                  variant="outline-secondary"
                  onClick={() => setShowLiveCam(true)}
                >
                  + Add LiveCam
                </Button>
              </div>
            )}
          </div>  
        </div>
      </div>
    </div>
  );
};

export default LiveCam;