import React, { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Polyline, Popup } from "react-leaflet";
import L from "leaflet";
import axios from "axios";
import "leaflet/dist/leaflet.css";

// Fix leaflet marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

// Custom icons
const DRIVER_ICON = new L.Icon({
  iconUrl: "https://cdn-icons-png.flaticon.com/512/4474/4474284.png",
  iconSize: [32, 32],
  iconAnchor: [16, 32],
});

const PICKUP_ICON = new L.Icon({
  iconUrl: "https://cdn-icons-png.flaticon.com/512/4474/4474228.png",
  iconSize: [28, 28],
  iconAnchor: [14, 28],
});

const DROP_ICON = new L.Icon({
  iconUrl: "https://cdn-icons-png.flaticon.com/512/149/149060.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

// Config
const ORS_KEY = "5b3ce3597851110001cf6248ba39e587c4a94695a96bae7c245bd79e";
const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";

async function geocodeAddress(address) {
  if (!address || typeof address !== 'string') {
    console.error('Invalid address:', address);
    return null;
  }
  
  try {
    const response = await axios.get(NOMINATIM_URL, {
      params: {
        q: address,
        format: 'json',
        limit: 1,
        addressdetails: 1,
        'accept-language': 'en',
        email: 'your@email.com'
      }
    });
    
    if (!response.data?.[0]?.lat || !response.data?.[0]?.lon) {
      console.error('Geocoding failed for address:', address);
      return null;
    }
    
    return {
      latitude: parseFloat(response.data[0].lat),
      longitude: parseFloat(response.data[0].lon),
      address: response.data[0].display_name
    };
  } catch (error) {
    console.error("Geocoding error for address:", address, error);
    return null;
  }
}

async function fetchRoute(coords) {
  if (!Array.isArray(coords)) {
    console.error('Invalid coordinates:', coords);
    return null;
  }

  try {
    const { data } = await axios.post(
      "https://api.openrouteservice.org/v2/directions/driving-car/geojson",
      { 
        coordinates: coords,
        instructions: false
      },
      {
        headers: {
          'Authorization': ORS_KEY,
          'Content-Type': 'application/json',
          'Accept': 'application/json, application/geo+json'
        },
        timeout: 10000
      }
    );
    return data;
  } catch (err) {
    console.error("Route fetch error:", {
      status: err.response?.status,
      data: err.response?.data,
      message: err.message,
      config: err.config?.data
    });
    return null;
  }
}

export default function RoutesMap({ driverLocation,mode,startAddress, passengers = [] }) {
  const [routes, setRoutes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [driverCoords, setDriverCoords] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;

    async function buildRoutes() {
      setLoading(true);
      setError(null);

      const start = (mode === "auto") ? driverLocation : startAddress;
      try {
        // 1. Geocode driver's location
        const driverLocationCoords = await geocodeAddress(start);
        console.log("driver coordinate",driverLocationCoords)
        if (!driverLocationCoords) {
          throw new Error("Could not geocode driver's location");
        }

        if (isMounted) {
          setDriverCoords(driverLocationCoords);
        }

        // 2. Process passenger routes if any
        if (passengers.length > 0) {
          const passengerRoutes = await Promise.all(
            passengers.map(async (passenger) => {
              try {
                console.log("pssenger drop",passenger.drop);
                const [dropCoords, pickupCoords] = await Promise.all([
                  geocodeAddress(passenger.drop),
                 geocodeAddress(passenger.pickup),
                ]);

                console.log(pickupCoords,dropCoords);
                if (!pickupCoords || !dropCoords) {
                  console.warn(`Skipping passenger ${passenger.id} due to geocoding failure`);
                  return null;
                }

                const route = await fetchRoute([
                  [driverLocationCoords.longitude, driverLocationCoords.latitude],
                  [pickupCoords.longitude, pickupCoords.latitude],
                  [dropCoords.longitude, dropCoords.latitude]
                ]);

                return route ? {
                  ...passenger,
                  routeData: route,
                  pickupCoords,
                  dropCoords
                } : null;
              } catch (err) {
                console.error(`Error processing passenger ${passenger.id}:`, err);
                return null;
              }
            })
          );

          if (isMounted) {
            setRoutes(passengerRoutes.filter(route => route !== null));
          }
        }
      } catch (err) {
        console.error("Error building routes:", err);
        if (isMounted) {
          setError(err.message || "Failed to load routes. Please check addresses and try again.");
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    if (driverLocation) {
      buildRoutes();
    }

    return () => { isMounted = false; };
  }, [driverLocation, passengers]);

  if (loading) return <div className="p-4 text-center">Loading routes...</div>;
  if (error) return <div className="p-4 text-center text-red-500">{error}</div>;
  if (!driverCoords) return <div className="p-4 text-center">No driver location available</div>;

  const mapCenter = [driverCoords.latitude, driverCoords.longitude];

  return (
    <div className="border rounded-lg overflow-hidden" style={{ height: "500px", width: "100%" }}>
      <MapContainer 
        center={mapCenter} 
        zoom={13} 
        style={{ height: "100%", width: "100%" }}
        scrollWheelZoom={true}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://openstreetmap.org">OpenStreetMap</a>'
        />

        {/* Driver Marker */}
        <Marker 
          position={mapCenter} 
          icon={DRIVER_ICON}
        >
          <Popup>Driver Location: {driverLocation}</Popup>
        </Marker>

        {/* Passenger Routes */}
        {routes.map((route) => {
          if (!route.routeData?.features?.[0]?.geometry?.coordinates) return null;
          
          const line = route.routeData.features[0].geometry.coordinates.map(
            ([lng, lat]) => [lat, lng]
          );
          
          const color = `#${Math.floor(Math.random()*16777215).toString(16).padStart(6, '0')}`;

          return (
            <React.Fragment key={route.id}>
              <Marker 
                position={[route.pickupCoords.latitude, route.pickupCoords.longitude]} 
                icon={PICKUP_ICON}
              >
                <Popup>
                  <div>
                    <strong>{route.name}</strong><br />
                    Pickup: {route.pickupCoords.address || route.pickup}<br />
                    {route.fare && `Fare: ₹${route.fare.toFixed(2)}`}
                  </div>
                </Popup>
              </Marker>
              
              <Marker 
                position={[route.dropCoords.latitude, route.dropCoords.longitude]} 
                icon={DROP_ICON}
              >
                <Popup>
                  <div>
                    <strong>{route.name}</strong><br />
                    Drop: {route.dropCoords.address || route.drop}<br />
                    {route.distance && `Distance: ${route.distance} km`}
                  </div>
                </Popup>
              </Marker>
              
              <Polyline
                positions={line}
                color={color}
                weight={3}
                opacity={0.7}
              >
                <Popup>{route.name}'s Route</Popup>
              </Polyline>
            </React.Fragment>
          );
        })}
      </MapContainer>
    </div>
  );
}