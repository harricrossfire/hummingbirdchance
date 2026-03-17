// api/hummers.js
export default async function handler(req, res) {
    const { lat, lon, q } = req.query;
    
    // 1. Determine the query
    const weatherQuery = q ? encodeURIComponent(q) : `${lat},${lon}`;
    
    // 2. Fetch Weather
    const weatherUrl = `https://api.weatherapi.com/v1/current.json?key=${process.env.HUMMER_WEATHER_KEY}&q=${weatherQuery}`;

    try {
        const weatherRes = await fetch(weatherUrl);
        const weatherData = await weatherRes.json();

        if (weatherData.error) {
            return res.status(400).json({ error: "Weather location not found" });
        }

        // 3. Get coordinates from weather to feed into eBird
        const actualLat = weatherData.location.lat;
        const actualLon = weatherData.location.lon;

        // 4. Fetch Birds
        const eBirdUrl = `https://api.ebird.org/v2/data/obs/geo/recent?lat=${actualLat}&lng=${actualLon}&dist=25`;
        const eBirdRes = await fetch(eBirdUrl, {
            headers: { 'X-eBirdApiToken': process.env.HUMMER_BIRD_KEY }
        });
        const birdData = await eBirdRes.json();

        res.status(200).json({
            weather: weatherData,
            birds: Array.isArray(birdData) ? birdData : []
        });

    } catch (err) {
        res.status(500).json({ error: "Server error" });
    }
}