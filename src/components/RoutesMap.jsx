/************************************************************************
 * RoutesMap.jsx  —  coordinate‑only, fits { latitude, longitude } shape
 ************************************************************************/
import React, { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Polyline, Popup } from "react-leaflet";
import L from "leaflet";
import axios from "axios";
import "leaflet/dist/leaflet.css";

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

// ---- config ----------------------------------------------------------
const ORS_KEY        = "5b3ce3597851110001cf6248ba39e587c4a94695a96bae7c245bd79e";
const USE_DEV_PROXY  = true;                               // false in prod
const DEV_PROXY      = "https://cors.isomorphic-git.org/"; // dev‑only CORS

const DROP_ICON = new L.Icon({
  iconUrl: "https://cdn-icons-png.flaticon.com/512/149/149060.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

// helper: coord object → [lng,lat]
const toLngLat = ({ latitude, longitude }) => [longitude, latitude];

async function fetchRoute(coords) {
  try {
    const { data } = await axios.post(
      "/ors/v2/directions/driving-car/geojson", // Uses Vite proxy
      { coordinates: coords },
      {
        headers: {
          Authorization: ORS_KEY,
          "Content-Type": "application/json",
        },
      }
    );
    return data;
  } catch (err) {
    console.error("Route fetch error:", err);
    return null;
  }
}

export default function RoutesMap({ driverLocation, passengers }) {
  const [routes, setRoutes] = useState([]);
  const [loading, setLoading] = useState(true);

  console.log(driverLocation);
  console.log(passengers)
  useEffect(() => {
    async function build() {
      setLoading(true);
      const results = await Promise.all(
        passengers.map(async (p) => {
          const legs = [
            toLngLat(driverLocation),
            toLngLat(p.pickup),
            toLngLat(p.drop),
          ];
          const geojson = await fetchRoute(legs);
          return geojson ? { ...p, geojson } : null;
        })
      );
      setRoutes(results.filter(Boolean));
      setLoading(false);
    }
    build();
  }, [driverLocation, passengers]);

  const mapCenter = [driverLocation.latitude, driverLocation.longitude];

  return (
    <div style={{ height: "600px", width: "100%" }}>
      {loading && <p>Loading routes…</p>}

      <MapContainer center={mapCenter} zoom={11} style={{ height: "100%", width: "100%" }}>
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://openstreetmap.org">OpenStreetMap</a>'
        />

        {/* driver */}
        <Marker position={mapCenter}>
          <Popup>Driver Start</Popup>
        </Marker>

        {/* passengers */}
        {routes.map((r) => {
          const line = r.geojson.features[0].geometry.coordinates.map(
            ([lng, lat]) => [lat, lng]
          );
          const color =
            "#" +
            ((Math.random() * 0xffffff) << 0)
              .toString(16)
              .padStart(6, "0");

          return (
            <React.Fragment key={r.id}>
              <Marker position={[r.pickup.latitude, r.pickup.longitude]}>
                <Popup>{r.name} — pickup</Popup>
              </Marker>
              <Marker position={[r.drop.latitude, r.drop.longitude]} icon={DROP_ICON}>
                <Popup>{r.name} — drop</Popup>
              </Marker>
              <Polyline positions={line} color={color} weight={4} opacity={0.85}>
                <Popup>{r.name} route</Popup>
              </Polyline>
            </React.Fragment>
          );
        })}
      </MapContainer>
    </div>
  );
}
