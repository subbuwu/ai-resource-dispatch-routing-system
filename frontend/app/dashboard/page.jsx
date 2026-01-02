"use client";

import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";

export default function Dashboard() {

    const [ location, setLocation ] = useState(null);

    useEffect(() => {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                setLocation([
                    position.coords.latitude,
                    position.coords.longitude
                ]);
            },
            () => {
                alert("Location access is required to cotinue.");
            }
        );
    },[]);

    return (
        <div className="min-h-screen ">
            {location ? (
                < MapContainer center={location} zoom={14} className= "h-screen w-full" >
                    <TileLayer
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    <Marker position={location}>
                        <Popup>Your current location</Popup>
                    </Marker>
                </MapContainer>
            ) : (
                <div className="h-screen flex items-center justify-center text-xl">
                    Fetching your location...    
                </div>
            )}
        </div>
    );
}