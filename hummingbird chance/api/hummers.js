// api/hummers.js
export default async function handler(req, res) {
    const { lat, lon, q } = req.query;
    
    // 1. Determine the query (Use "q" if it exists, otherwise lat/lon)
    const weatherQuery = q ? q : `${lat},${lon}`;
    const weatherUrl = `https://api.weatherapi.com/v1/current.json?key=${process.env.WEATHER_API_KEY}&q=${weatherQuery}`;

    try {
        const weatherRes = await fetch(weatherUrl);
        const weatherData = await weatherRes.json();

        if (weatherData.error) {
            return res.status(400).json({ error: "Location not found" });
        }

        // 2. CRITICAL: Get the actual lat/lon from the weather response
        // This works even if the user typed "Austin" or "78704"
        const actualLat = weatherData.location.lat;
        const actualLon = weatherData.location.lon;

        // 3. Now use those real numbers for eBird
        const eBirdUrl = `https://api.ebird.org/v2/data/obs/geo/recent?lat=${actualLat}&lng=${actualLon}&dist=25`;
        const eBirdRes = await fetch(eBirdUrl, {
            headers: { 'X-eBirdApiToken': process.env.EBIRD_API_KEY }
        });
        const birdData = await eBirdRes.json();

        // 4. Send everything back to Mom's browser
        res.status(200).json({
            weather: weatherData,
            birds: birdData
        });

    } catch (err) {
        res.status(500).json({ error: "Failed to fetch data" });
    }
}