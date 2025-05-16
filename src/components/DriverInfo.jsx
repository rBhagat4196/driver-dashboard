import React, { useState, useEffect } from "react";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "../firebase";
import { FaCar, FaMapMarkerAlt } from "react-icons/fa";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

// Fix marker icon issue in Leaflet + React
// delete L.Icon.Default.prototype._getIconUrl;
// L.Icon.Default.mergeOptions({
//   iconRetinaUrl: require("leaflet/dist/images/marker-icon-2x.png"),
//   iconUrl: require("leaflet/dist/images/marker-icon.png"),
//   shadowUrl: require("leaflet/dist/images/marker-shadow.png"),
// });

export default function DriverInfo({ uid }) {
  const [info, setInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [locationError, setLocationError] = useState(null);
  const [isUpdatingLocation, setIsUpdatingLocation] = useState(false);

  useEffect(() => {
    const fetchDriverInfo = async () => {
      try {
        const docRef = doc(db, "drivers", uid);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          setInfo(docSnap.data());
          if (docSnap.data().currentLocation) {
            setCurrentLocation(docSnap.data().currentLocation);
          }
        } else {
          console.warn("No driver data found");
        }
      } catch (err) {
        console.error("Failed to fetch driver info:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchDriverInfo();
  }, [uid]);

  const updateDriverLocation = async () => {
    if (!navigator.geolocation) {
      setLocationError("Geolocation is not supported by your browser");
      return;
    }

    setIsUpdatingLocation(true);
    setLocationError(null);

    try {
      const position = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        });
      });

      const newLocation = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        timestamp: new Date().toISOString(),
      };

      setCurrentLocation(newLocation);

      const driverRef = doc(db, "drivers", uid);
      await updateDoc(driverRef, {
        currentLocation: newLocation,
        lastUpdated: new Date().toISOString(),
      });
    } catch (err) {
      console.error("Error getting location:", err);
      setLocationError("Unable to retrieve your location");
    } finally {
      setIsUpdatingLocation(false);
    }
  };

  useEffect(() => {
    const interval = setInterval(() => {
      if (info?.mode === "cab" || info?.mode === "auto") {
        updateDriverLocation();
      }
    }, 300000);

    return () => clearInterval(interval);
  }, [info?.mode]);

  if (loading)
    return (
      <div className="bg-white p-6 rounded-lg shadow-md animate-pulse">
        <div className="h-6 w-1/3 bg-gray-200 rounded mb-4"></div>
        <div className="space-y-3">
          <div className="h-4 w-full bg-gray-100 rounded"></div>
          <div className="h-4 w-3/4 bg-gray-100 rounded"></div>
          <div className="h-4 w-2/3 bg-gray-100 rounded"></div>
        </div>
      </div>
    );

  if (!info)
    return (
      <div className="bg-white p-6 rounded-lg shadow-md text-center">
        <h3 className="mt-2 text-lg font-medium text-gray-700">
          No driver info found
        </h3>
        <p className="mt-1 text-gray-500">
          We couldn't load the driver details
        </p>
      </div>
    );

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-gray-800">Driver Profile</h2>
        <span className="px-3 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-full">
          {info.mode === "auto" ? "AUTO" : "CAB"} MODE
        </span>
      </div>

      <div className="space-y-4">
        {/* Driver Name */}
        <div className="flex items-center">
          <div className="bg-blue-100 p-2 rounded-lg mr-3">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5 text-blue-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
              />
            </svg>
          </div>
          <div>
            <p className="text-sm text-gray-500">Driver Name</p>
            <p className="font-medium">{info.name}</p>
          </div>
        </div>

        {/* Email */}
        <div className="flex items-center">
          <div className="bg-green-100 p-2 rounded-lg mr-3">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5 text-green-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
              />
            </svg>
          </div>
          <div>
            <p className="text-sm text-gray-500">Email</p>
            <p className="font-medium">{info.email}</p>
          </div>
        </div>

        {/* Vehicle */}
        <div className="flex items-center">
          <div className="bg-purple-100 p-2 rounded-lg mr-3">
            <FaCar className="h-5 w-5 text-purple-600" />
          </div>
          <div>
            <p className="text-sm text-gray-500">Vehicle Number</p>
            <p className="font-medium">{info.vehicle}</p>
          </div>
        </div>

        {/* Location on Map */}
        <div className="flex items-start">
          <div className="bg-red-100 p-2 rounded-lg mr-3">
            <FaMapMarkerAlt className="h-5 w-5 text-red-600" />
          </div>
          <div className="flex-1">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm text-gray-500">Current Location</p>
                {currentLocation ? (
                  <p className="text-xs text-gray-400 mt-1">
                    Last updated:{" "}
                    {new Date(currentLocation.timestamp).toLocaleTimeString()}
                  </p>
                ) : (
                  <p className="text-gray-400">Location not available</p>
                )}
              </div>
              <button
                onClick={updateDriverLocation}
                disabled={isUpdatingLocation}
                className={`ml-2 px-3 py-1 text-sm rounded-md ${
                  isUpdatingLocation
                    ? "bg-gray-200 text-gray-500"
                    : "bg-blue-600 text-white hover:bg-blue-700"
                }`}
              >
                {isUpdatingLocation ? "Updating..." : "Update Location"}
              </button>
            </div>
            {locationError && (
              <p className="text-xs text-red-500 mt-1">{locationError}</p>
            )}

            {/* Map Rendering */}
            {currentLocation && (
              <div className="mt-4 h-64 rounded overflow-hidden shadow border">
                <MapContainer
                  center={[currentLocation.latitude, currentLocation.longitude]}
                  zoom={15}
                  scrollWheelZoom={false}
                  style={{ height: "100%", width: "100%" }}
                >
                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a>'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                  <Marker
                    position={[
                      currentLocation.latitude,
                      currentLocation.longitude,
                    ]}
                  >
                    <Popup>
                      Driver is here 🚖 <br />
                      {info.name}
                    </Popup>
                  </Marker>
                </MapContainer>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
