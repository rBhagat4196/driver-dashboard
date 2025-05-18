// src/App.js
import React from "react"
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Login from "./auth/Login";
import Register from "./auth/Register";
import DriverDashboard from "./pages/DriverDashboard";
import SeedDataButton from "./seedDataButton";
import CreateRequest from "./createRequest";
function App() {
  return (<>
    {/* <SeedDataButton /> */}
    {/* <CreateRequest/> */}
    <Router>
      <Routes>
        <Route path="/" element={<DriverDashboard />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/dashboard" element={<DriverDashboard />} />
      </Routes>
    </Router>
  </>
  );
}

export default App;
