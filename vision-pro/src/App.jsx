import { useState } from 'react'
import { BrowserRouter as Router, Route, Routes, useNavigate } from 'react-router-dom';


import './App.css'
import ClassBasedComponent from './components/class-based-component'
import FunctionalComponent from './components/functional-component'
import ActivititesList from './components/Activities'
import Features from './components/Activities/components/activities'
import Sidebar from './Dashboard'
import TopNav from './components/Activities/components/TopNav'
import Dashboard from './Dashboard';
import Livecam from './Livecam';
import Services from './Services';
import Events from './Events';


function App() {
  const [count, setCount] = useState(0)
  

  return (
    <div>
     
      {/*<ClassBasedComponent></ClassBasedComponent>*/}
      <Router>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/home" element={<Dashboard />} />
        <Route path="/Livecam" element={<Livecam />} />
        <Route path="/Services" element={<Services />} />
        <Route path="/Events" element={<Events />} />
        
      </Routes>
    </Router>
      

    </div>
  )
}

export default App
