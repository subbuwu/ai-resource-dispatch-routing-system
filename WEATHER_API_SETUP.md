# OpenWeatherMap API Setup Guide

This guide will help you set up the OpenWeatherMap API for real-time weather data in the Disaster Relief Routing System.

## Step 1: Sign Up for OpenWeatherMap

1. Go to: https://home.openweathermap.org/users/sign_up
2. Create a free account (no credit card required)
3. Verify your email address

## Step 2: Get Your API Key

1. After signing in, go to: https://home.openweathermap.org/api_keys
2. You'll see a default API key, or you can create a new one
3. Copy your API key (it looks like: `a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6`)

## Step 3: Add API Key to Backend

1. Navigate to the `backend` directory
2. Open or create a `.env` file
3. Add the following line:

```env
OPENWEATHER_API_KEY=your_actual_api_key_here
```

Replace `your_actual_api_key_here` with the API key you copied.

### Example `.env` file:

```env
# OSRM Server URL
OSRM_BASE_URL=http://localhost:4000

# OpenWeatherMap API Key
OPENWEATHER_API_KEY=a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6

# Backend Configuration
BACKEND_HOST=0.0.0.0
BACKEND_PORT=8000
```

## Step 4: Restart Backend Server

After adding the API key, restart your backend server:

```bash
# Stop the current server (Ctrl+C)
# Then restart:
cd backend
source venv/bin/activate  # On Windows: venv\Scripts\activate
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

## Step 5: Verify It's Working

1. Start the backend server
2. Open your browser and go to: http://localhost:8000/docs
3. Find the `/weather/` endpoint
4. Test it with coordinates:
   - latitude: `12.6939`
   - longitude: `79.9757`
5. You should see weather data returned

## Free Tier Limits

The free tier includes:
- **60 API calls per minute**
- **1,000,000 API calls per month**
- Current weather data
- 5-day/3-hour forecast (limited)
- Weather maps (limited)

This is more than enough for development and moderate production use.

## Troubleshooting

### "Invalid API Key" Error

- Make sure you copied the entire API key
- Check for extra spaces in the `.env` file
- Wait a few minutes after creating the key (activation delay)
- Verify the key at: https://home.openweathermap.org/api_keys

### "API calls limit exceeded"

- You've exceeded the 60 calls/minute limit
- Wait a minute and try again
- Consider caching weather data in production

### Weather data shows "API key not configured"

- Check that `.env` file is in the `backend` directory
- Verify the variable name is `OPENWEATHER_API_KEY` (not `OPENWEATHERMAP_API_KEY`)
- Restart the backend server after adding the key

### No Weather Data / Mock Data Showing

- The system will show sample data if the API key is missing
- Check that your `.env` file is being loaded correctly
- Verify the API key is correct
- Check backend logs for error messages

## Testing Without API Key

The system will work without an API key, but will show sample/mock weather data. This is useful for:
- Development when API key is not available
- Testing the UI without making API calls
- Demonstrating the system

However, for production use, you should always configure a valid API key.

## Additional Resources

- OpenWeatherMap API Documentation: https://openweathermap.org/api
- API Key Management: https://home.openweathermap.org/api_keys
- Support: https://openweathermap.org/faq

---

**Note:** Keep your API key secure and never commit it to version control. The `.env` file is already in `.gitignore`.
