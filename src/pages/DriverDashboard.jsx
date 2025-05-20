import React, { useState, useEffect } from "react";
import { useAuthState, useSignOut } from "react-firebase-hooks/auth";
import { useNavigate } from "react-router-dom";
import { auth } from "../firebase";
import { FaSignOutAlt } from "react-icons/fa";
import { db } from "../firebase";
import { doc,updateDoc,getDoc} from "firebase/firestore";
import DriverInfo from "../components/DriverInfo";
import EarningsHistory from "../components/EarningsHistory";
import CurrentRide from "../components/CurrentRide";
import RideRequests from "../components/RideRequests";
import AutoRideStatus from "../components/AutoRideStatus";
import Analytics from "../components/Analytics";
const tabs = [
  { id: "info", label: "Driver Info", icon: "👤" },
  { id: "currentRide", label: "Current Ride", icon: "🚕" },
  { id: "rideRequests", label: "Ride Requests", icon: "🔄" },
  { id: "earnings", label: "Earnings", icon: "💰" },
  { id: "autoStatus", label: "Auto Mode", icon: "⚙️" },
  { id: "analytics", label: "Analytics", icon: "📊" },
];

export default function DriverDashboard() {
  const [user, loading] = useAuthState(auth);
  const [signOut, signOutLoading] = useSignOut(auth);
  const [activeTab, setActiveTab] = useState("info");
  const navigate = useNavigate();
  const [imageUrl, setImageUrl] = useState(null);
  const [upLoading, setUploading] = useState(false);
  const [driver,setDriver] = useState(null);
  const cloudName = import.meta.env.VITE_CLOUDNAME;
  const unsignedPreset = import.meta.env.VITE_PRESET;
  useEffect(() => {
    if (!loading && !user) {
      navigate("/login");
    }
  }, [user, loading, navigate]);

  const handleLogout = async () => {
    try {
      await signOut();
      navigate("/login");
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  useEffect(() => {
  const fetchDriver = async () => {
    if (!user?.uid) return;

    try {
      const driverRef = doc(db, "drivers", user.uid);
      const snapShot = await getDoc(driverRef);

      if (snapShot.exists()) {
        const data = snapShot.data();
        setDriver(data); // ✅ set actual data
      }
    } catch (err) {
      console.error("Error fetching driver data:", err);
    }
  };

  fetchDriver();
}, [user?.uid,imageUrl]); // ✅ use a reliable dependency


  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    console.log(file);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", unsignedPreset);

    setUploading(true);
    try {
      const res = await fetch(
        `https://api.cloudinary.com/v1_1/${cloudName}/upload`,
        {
          method: "POST",
          body: formData,
        }
      );

      const data = await res.json();
      console.log(data);
      setImageUrl(data.secure_url);
      const driverRef = doc(db,"drivers",user.uid);
      await updateDoc(driverRef,{
        profileURL : data.secure_url
      })
    } catch (err) {
      console.error("Upload failed", err);
    } finally {
      setUploading(false);
    }
  };
  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  // console.log(driver)
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile Header */}
      <header className="lg:hidden bg-blue-600 text-white p-4 flex justify-between items-center">
        <h1 className="text-xl font-bold">Driver Panel</h1>
        <select
          value={activeTab}
          onChange={(e) => setActiveTab(e.target.value)}
          className="bg-blue-700 text-white p-2 rounded-md"
        >
          {tabs.map(({ id, label }) => (
            <option key={id} value={id}>
              {label}
            </option>
          ))}
        </select>
      </header>

      <div className="flex flex-col lg:flex-row">
        {/* Sidebar - Desktop */}
        <aside className="hidden lg:block w-64 bg-white shadow-md p-6">
          <div className="sticky top-0 space-y-8 h-screen flex flex-col">
            <div>
              <h2 className="text-2xl font-bold text-blue-600">Driver Panel</h2>
              <nav className="flex flex-col space-y-2 mt-6">
                {tabs.map(({ id, label, icon }) => (
                  <button
                    key={id}
                    onClick={() => setActiveTab(id)}
                    className={`flex items-center px-4 py-3 rounded-lg font-medium transition
                      ${
                        activeTab === id
                          ? "bg-blue-600 text-white shadow-md"
                          : "text-gray-700 hover:bg-blue-50"
                      }`}
                  >
                    <span className="mr-3 text-lg">{icon}</span>
                    {label}
                  </button>
                ))}
              </nav>
            </div>

            {/* User info and logout at bottom */}
            {user && (
              <div className="mt-auto border-t border-gray-200 pt-4">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="relative w-10 h-10 group">
                    {driver?.profileURL ? (
                      <div className="w-full h-full rounded-full overflow-hidden bg-blue-100 border border-gray-300 shadow-sm group-hover:brightness-90 transition">
                        <img
                          src={driver?.profileURL}
                          alt="Profile"
                          className="w-full h-full object-cover"
                        />
                        {/* "Edit" overlay on hover */}
                        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-30 text-white text-xs font-semibold opacity-0 group-hover:opacity-100 transition">
                          Edit
                        </div>
                      </div>
                    ) : (
                      <div className="w-full h-full rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-semibold text-sm">
                        {user?.displayName?.charAt(0)?.toUpperCase() ||
                          user?.email?.charAt(0)?.toUpperCase()}
                      </div>
                    )}

                    {/* Invisible file input covering the entire avatar */}
                    <input
                      id="file-upload"
                      type="file"
                      accept="image/*"
                      onChange={handleUpload}
                      className="absolute inset-0 opacity-0 cursor-pointer"
                    />
                  </div>

                  <div>
                    <p className="font-medium text-gray-900 truncate">
                      {user.displayName || "Driver"}
                    </p>
                    <p className="text-sm text-gray-500 truncate">
                      {user.email}
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleLogout}
                  disabled={signOutLoading}
                  className={`w-full flex items-center justify-center px-4 py-2 rounded-lg text-red-600 hover:bg-red-50 transition ${
                    signOutLoading ? "opacity-70 cursor-not-allowed" : ""
                  }`}
                >
                  <FaSignOutAlt className="mr-2" />
                  {signOutLoading ? "Signing out..." : "Sign Out"}
                </button>
              </div>
            )}
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-4 lg:p-8">
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex justify-between items-center mb-6">
              <h1 className="text-2xl lg:text-3xl font-bold text-gray-800">
                {tabs.find((tab) => tab.id === activeTab)?.label}
              </h1>
              {/* Mobile Logout Button */}
              <button
                onClick={handleLogout}
                className="lg:hidden flex items-center text-red-600 hover:text-red-800"
              >
                <FaSignOutAlt className="mr-1" />
                <span>Logout</span>
              </button>
            </div>

            <div className="min-h-[60vh]">
              {activeTab === "info" && <DriverInfo uid={user?.uid} />}
              {activeTab === "rideRequests" && <RideRequests uid={user?.uid} />}
              {activeTab === "currentRide" && <CurrentRide uid={user?.uid} />}
              {activeTab === "earnings" && <EarningsHistory uid={user?.uid} />}
              {activeTab === "autoStatus" && <AutoRideStatus uid={user?.uid} />}
              {activeTab === "analytics" && <Analytics uid={user?.uid} />}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
