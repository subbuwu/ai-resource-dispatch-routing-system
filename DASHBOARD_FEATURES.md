# Dashboard Features - User Dispatch System

## Overview

The new dashboard provides a comprehensive user-side interface for requesting emergency supplies and getting routed to the nearest relief centre with real-time weather information and step-by-step directions.

## Key Features

### 1. **Supply Request System**
- **CTA Button**: Prominent "Request Supplies" button for emergency assistance
- **Supply Selection**: Interactive modal with 8 supply categories:
  - 🍽️ Food & Water
  - 🏥 Medical Supplies
  - 🏠 Shelter
  - 👕 Clothing
  - 🛏️ Blankets
  - 🧴 Hygiene Items
  - 🔦 Batteries & Flashlights
  - 📱 Communication Devices
- **Confirmation Flow**: Two-step confirmation process to ensure accuracy

### 2. **Automatic Routing**
- Automatically finds the nearest relief centre using OSRM routing
- Calculates actual travel distance and time (not straight-line)
- Displays route on interactive map with highlighted path
- Shows relief centre information (name, capacity, distance, travel time)

### 3. **Real-Time Weather Integration**
- **Current Weather**: Displays weather at user's location in header
  - Temperature (°C)
  - Weather condition and description
  - Rainfall intensity (if raining)
  - Weather icon from OpenWeatherMap
- **Route Weather**: Weather data along the route
  - Average temperature along route
  - Maximum rainfall detected
  - Weather alerts if any
- **Auto-Refresh**: Weather updates every 5 minutes automatically
- **Weather Alerts**: Displays severe weather warnings if detected

### 4. **Step-by-Step Directions**
- Toggle-able directions panel
- Clear, numbered instructions
- Distance-based waypoints
- Final destination confirmation

### 5. **Interactive Map**
- **User Location**: Green marker showing current position
- **Relief Centres**: Blue markers for all active centres
- **Nearest Centre**: Orange highlighted marker for selected centre
- **Route Path**: Orange polyline showing the route
- **Auto-Zoom**: Map automatically fits all relevant points

### 6. **Visual Design**
- Modern, clean interface with gradient headers
- Color-coded information panels
- Responsive sidebar with scrollable content
- Smooth animations and transitions
- Mobile-friendly layout

## User Flow

1. **Page Load**
   - System gets user's location via Geolocation API
   - Fetches all active relief centres
   - Loads current weather data
   - Displays map with user location

2. **Request Supplies**
   - User clicks "🆘 Request Supplies" button
   - Modal opens with supply selection grid
   - User selects needed supplies (can select multiple)
   - User clicks "Continue"

3. **Confirmation**
   - Confirmation modal shows selected supplies
   - User reviews and confirms
   - User clicks "✅ Confirm & Route"

4. **Routing**
   - System finds nearest relief centre
   - Calculates route using OSRM
   - Fetches weather along route
   - Generates step-by-step directions
   - Updates map with route and destination

5. **Navigation**
   - User sees route on map
   - Can view step-by-step directions
   - Weather information updates automatically
   - All relevant information displayed in sidebar

## API Endpoints Used

### Backend Endpoints

1. **GET `/relief-centres/`**
   - Fetches all active relief centres
   - Used on page load

2. **POST `/relief-centres/nearest`**
   - Finds nearest relief centre to user location
   - Returns route geometry and summary
   - Used when user confirms supply request

3. **GET `/weather/?latitude={lat}&longitude={lng}`**
   - Gets current weather at location
   - Used for user location and auto-refresh

4. **POST `/weather/route`**
   - Gets weather data along route
   - Samples multiple points along the path
   - Returns summary statistics

## Configuration

### OpenWeatherMap API Key

To enable real-time weather data:

1. Sign up at: https://openweathermap.org/api
2. Get your free API key
3. Add to `backend/.env`:
   ```
   OPENWEATHER_API_KEY=your_api_key_here
   ```

See `WEATHER_API_SETUP.md` for detailed instructions.

### Without API Key

The system works without an API key but shows sample weather data. This is useful for:
- Development and testing
- Demonstrations
- When API key is not available

## Technical Details

### Frontend Technologies
- **Next.js 14+**: React framework with App Router
- **React Leaflet**: Map integration
- **TypeScript**: Type-safe development
- **Tailwind CSS**: Styling

### Backend Technologies
- **FastAPI**: Python web framework
- **OpenWeatherMap API**: Weather data
- **OSRM**: Routing engine
- **SQLite**: Relief centre database

### Real-Time Updates
- Weather refreshes every 5 minutes
- Uses `setInterval` for automatic updates
- Cleans up intervals on component unmount

### Error Handling
- Graceful fallbacks if location unavailable
- Error messages displayed in UI
- API failures don't break the app
- Sample data shown if weather API unavailable

## File Structure

```
frontend/app/
├── page.tsx              # Root page (redirects to dashboard)
├── dashboard/
│   └── page.tsx          # Main dashboard with all features
└── route/
    └── page.tsx          # Original route planner (still available)

backend/app/
├── services/
│   └── weather_service.py    # OpenWeatherMap integration
├── routers/
│   └── weather.py             # Weather API endpoints
└── schemas/
    └── weather.py              # Weather data models
```

## Future Enhancements

Potential improvements:
- [ ] Voice navigation instructions
- [ ] Offline map support
- [ ] Push notifications for weather alerts
- [ ] Multiple route alternatives
- [ ] Estimated arrival time updates
- [ ] Share route with others
- [ ] Save favorite relief centres
- [ ] Multi-language support

## Troubleshooting

### Location Not Working
- Check browser permissions for geolocation
- Ensure HTTPS or localhost (required for geolocation)
- Check browser console for errors

### Weather Not Updating
- Verify API key in `.env` file
- Check backend logs for API errors
- Ensure backend server is running
- Check network connectivity

### Route Not Showing
- Verify OSRM server is running
- Check backend logs for routing errors
- Ensure relief centres are seeded in database
- Verify coordinates are valid

### Directions Not Generating
- Check that route data is available
- Verify coordinates array is not empty
- Check browser console for errors

---

**Note**: The dashboard is designed to be user-friendly and work even if some services are unavailable. It gracefully degrades to show available information.
