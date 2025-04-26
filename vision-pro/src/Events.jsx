import React, { useState, useEffect } from 'react';
import './Dashboard.css';
import './Events.css';
import { useNavigate } from 'react-router-dom';
import { CgSearch } from 'react-icons/cg';
import { FaFileExport, FaSort, FaSortUp, FaSortDown } from 'react-icons/fa';
import axios from 'axios';
import * as XLSX from 'xlsx';

const Events = () => {
  const navigate = useNavigate();
  
  // State management
  const [gridData, setGridData] = useState([]);
  const [filters, setFilters] = useState({
    plateNumber: '',
    date: ''
  });
  const [sorting, setSorting] = useState({
    field: null,
    direction: 'asc'
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Fetch data
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const response = await axios.get('http://127.0.0.1:5000/search-number-plate/', {
          params: {
            plate: filters.plateNumber,
            page: 1,
            limit: 100
          }
        });

        if (response.data.success) {
          setGridData(response.data.data);
        } else {
          setError('No data available');
        }
      } catch (err) {
        setError('Failed to fetch data: ' + err.message);
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Filter and sort data
  const getFilteredAndSortedData = () => {
    return gridData.filter(item => {
      return (
        item['Plate Number']?.toLowerCase().includes(filters.plateNumber.toLowerCase()) &&
        item.Timestamp?.includes(filters.date)
      );
    }).sort((a, b) => {
      if (!sorting.field) return 0;
      
      const aVal = a[sorting.field] || '';
      const bVal = b[sorting.field] || '';
      
      return sorting.direction === 'asc' 
        ? aVal.localeCompare(bVal)
        : bVal.localeCompare(aVal);
    });
  };

  return (
    <div className="dashboard">
      <aside className="sidebar">
        <h2 className="logo">Vision Pro</h2>
        <ul className="sidebar-menu">
          <li><button onClick={() => navigate("/home")}>Home</button></li>
          <li><button onClick={() => navigate("/Livecam")}>LiveCam</button></li>
          <li><button onClick={() => navigate("/Services")}>Services</button></li>
          <li><button onClick={() => navigate("/Events")}>Events</button></li>
        </ul>
        <footer>Powered by D&W<br />Version 1.0.0</footer>
      </aside>

      <main className="content">
        <header className="topbar">
          <span className="title" onClick={() => navigate("/Home")}>Home</span>
          <div className="user-info">
            <span className="notification-icon">🔔</span>
            <span className="user-avatar">👤</span>
            <span className="email">user@example.com</span>
          </div>
        </header>

        <div className="events-container">
          <h1>Vehicle Records</h1>

          <div className="search-controls">
            <div className="search-filters">
              <input
                type="text"
                placeholder="Search Plate Number"
                value={filters.plateNumber}
                onChange={(e) => setFilters(prev => ({
                  ...prev,
                  plateNumber: e.target.value
                }))}
                className="filter-input"
              />
              <input
                type="date"
                value={filters.date}
                onChange={(e) => setFilters(prev => ({
                  ...prev,
                  date: e.target.value
                }))}
                className="filter-input"
              />
              <button 
                onClick={() => {
                  const data = getFilteredAndSortedData();
                  const ws = XLSX.utils.json_to_sheet(data);
                  const wb = XLSX.utils.book_new();
                  XLSX.utils.book_append_sheet(wb, ws, "Vehicle Data");
                  XLSX.writeFile(wb, "vehicle_records.xlsx");
                }}
                className="export-button"
              >
                <FaFileExport /> Export to Excel
              </button>
            </div>
          </div>

          {loading ? (
            <div className="loading">Loading data...</div>
          ) : error ? (
            <div className="error">{error}</div>
          ) : (
            <div className="grid-container">
              <table className="excel-grid">
                <thead>
                  <tr>
                    <th onClick={() => setSorting({
                      field: 'Plate Number',
                      direction: sorting.direction === 'asc' ? 'desc' : 'asc'
                    })}>
                      Plate Number {sorting.field === 'Plate Number' && 
                        (sorting.direction === 'asc' ? <FaSortUp /> : <FaSortDown />)}
                    </th>
                    <th onClick={() => setSorting({
                      field: 'Timestamp',
                      direction: sorting.direction === 'asc' ? 'desc' : 'asc'
                    })}>
                      Timestamp {sorting.field === 'Timestamp' && 
                        (sorting.direction === 'asc' ? <FaSortUp /> : <FaSortDown />)}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {getFilteredAndSortedData().map((row, index) => (
                    <tr key={index}>
                      <td>{row['Plate Number']}</td>
                      <td>{row.Timestamp}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default Events;