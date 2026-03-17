// This runs on Vercel's servers, NOT the browser
export default async function handler(req, res) {
    const {lat,lon} = req.query;
    const weatherKey = process.env.HUMMER_WEATHER_API;
    const ebirdKey = process.env.HUMMER_BIRD_API;
    try{
        const [weatherapi,birdapi] = await Promise.all([
            fetch(`https://api.weatherapi.com/v1/current.json?key=${weatherKey}&q=${lat},${lon}`),
            fetch(`https://api.ebird.org/v2/data/obs/geo/recent?lat=${lat}&lng=${lon}&dist=2`, {
                headers: {'X-eBirdApiToken': ebirdKey}
            })
        ]);

        const weatherData = await weatherapi.json();
        const ebirdData = await birdapi.json();

        res.status(200).json({
            weather: weatherData,
            birds: ebirdData
        });
    } catch (e) {
        res.status(500).json({error: "Failed to fetch data"});
    }
}
