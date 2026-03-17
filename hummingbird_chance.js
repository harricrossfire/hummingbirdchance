async function updateAllData() {
    document.getElementById('loading').classList.remove('hidden');
    // Hide fallback if they are trying again
    document.getElementById('locationFallback').classList.add('hidden');

    navigator.geolocation.getCurrentPosition(async (pos) => {
        const { latitude: lat, longitude: lon } = pos.coords;
        
        try {
            const res = await fetch(`/api/hummers?lat=${lat}&lon=${lon}`);
            const data = await res.json();

            if (data.weather) processWeather(data.weather, lat); 
            if (data.birds) processSpecies(data.birds);

        } catch (e) {
            console.error("Backend error:", e);
            alert("Could not load data from the server.");
        }
        
        document.getElementById('loading').classList.add('hidden');
    }, (err) => { // This is the error callback for GPS
        console.warn("Geolocation error:", err.message);
        document.getElementById('loading').classList.add('hidden');
        document.getElementById('locationFallback').classList.remove('hidden'); 
    }, {
        enableHighAccuracy: true, 
        timeout: 10000,           
        maximumAge: 0            
    });
}

function processWeather(data, lat) { // 1. Added lat here
    let score = 40;
    const temp = data.current.temp_f;
    const wind = data.current.wind_mph;
    const hour = new Date().getHours();
    
    let timeNote = "";
    if (hour >= 6 && hour <= 9) {
        score += 30;
        timeNote = "It's breakfast time! Hummers are very active right now.";
    } else if (hour >= 17 && hour <= 20) {
        score += 30;
        timeNote = "Dusk feeding frenzy! They are fueling up for the night.";
    } else if (hour > 20 || hour < 5) {
        score = 5;
        timeNote = "The birds are likely sleeping (torpor) right now.";
    } else {
        score += 15;
        timeNote = "Daytime activity is steady.";
    }

    if (temp > 65 && temp < 85) score += 15;
    if (wind < 10) score += 15;
    if (data.current.condition.text.toLowerCase().includes('sun')) score += 10;
    if (data.current.condition.text.toLowerCase().includes('rain')) score -= 40;
    
    // 2. Added lat here so it reaches the UI function
    updateScoreUI(Math.max(5, Math.min(99, score)), data.current.condition.text, timeNote, lat);
}
async function updateByManualLocation() {
    const loc = document.getElementById('manualLocation').value;
    if (!loc) return alert("Please enter a city or zip code!");

    // UI Feedback
    document.getElementById('loading').classList.remove('hidden');
    document.getElementById('locationFallback').classList.add('opacity-50');

    try {
        // We pass 'q' as the query parameter
        const res = await fetch(`/api/hummers?q=${encodeURIComponent(loc)}`);
        const data = await res.json();

        if (data.error) throw new Error(data.error);

        // Get the lat from the backend's weather response to drive migration logic
        const manualLat = data.weather.location.lat;

        if (data.weather) processWeather(data.weather, manualLat);
        if (data.birds) processSpecies(data.birds);

        // Success! Hide the fallback box
        document.getElementById('locationFallback').classList.add('hidden');
        
    } catch (e) {
        console.error("Manual search error:", e);
        alert("Couldn't find that location. Please try a different City or Zip Code.");
    } finally {
        document.getElementById('loading').classList.add('hidden');
        document.getElementById('locationFallback').classList.remove('opacity-50');
    }
}
async function processSpecies(sightings) {
    const hummers = sightings.filter(s => s.comName.toLowerCase().includes('hummingbird'));
    const listEl = document.getElementById('speciesList');
    
    if (hummers.length === 0) {
        listEl.innerHTML = `<p class="text-gray-500 text-sm">No recent reports nearby. They might be hiding!</p>`;
    } else {
        const unique = [...new Map(hummers.map(item => [item.speciesCode, item])).values()].slice(0, 5);
        listEl.innerHTML = "";
        for (const h of unique) {
            // Wikipedia is public, so we fetch it here directly
            const wikiRes = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(h.comName)}`);
            const wikiData = await wikiRes.json();
            const imgUrl = wikiData.thumbnail ? wikiData.thumbnail.source : 'https://images.unsplash.com/photo-1444464666168-49d633b867ad?auto=format&fit=crop&w=100&q=80';

            listEl.innerHTML += `
                <div class="flex items-center gap-4 p-3 bg-white rounded-xl border border-green-100 shadow-sm transition-all hover:shadow-md">
                    <img src="${imgUrl}" class="species-img bg-gray-100" alt="${h.comName}">
                    <div class="flex-grow">
                        <div class="font-bold text-green-900 leading-tight">${h.comName}</div>
                        <div class="text-[10px] text-gray-400 uppercase font-semibold">${h.sciName}</div>
                    </div>
                    <a href="https://en.wikipedia.org/wiki/${h.comName.replace(/ /g, '_')}" target="_blank" class="p-2 text-blue-500 hover:bg-blue-50 rounded-full transition-colors">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path></svg>
                    </a>
                </div>
            `;
        }
    }
}

function updateScoreUI(score, cond, timeNote, lat) {
    // 1. Setup the progress circle
    const circle = document.getElementById('probCircle');
    const circumference = 2 * Math.PI * 80;
    circle.style.strokeDashoffset = circumference - (score / 100) * circumference;
    document.getElementById('probPercent').innerText = score + "%";

    // 2. Update Weather Text
    document.getElementById('weatherSummary').innerHTML = `
        <div class="mb-1">It's ${cond.toLowerCase()} right now.</div>
        <div class="text-xs font-bold text-green-700">${timeNote}</div>
    `;

    // 3. Migration Logic (Using the 'lat' we passed in)
    const now = new Date();
    const month = now.getMonth(); // 0 = Jan, 2 = March
    
    let migrationStatus = "Off-season. Sightings are rare.";
    let progressWidth = "20%";

    // Adjust arrival based on Latitude
    // South (Lat < 35): March | Mid (Lat 35-45): April | North (Lat > 45): May
    const arrivalMonth = (lat > 45) ? 4 : (lat > 35) ? 3 : 2; 

    if (month > arrivalMonth && month < 9) {
        migrationStatus = "Peak Season is active!";
        progressWidth = "90%";
    } else if (month === arrivalMonth) {
        migrationStatus = "They are arriving now! Keep your feeders ready.";
        progressWidth = "60%";
    } else if (month === 9) {
        migrationStatus = "Migration south has begun.";
        progressWidth = "40%";
    }

    document.getElementById('migrationProgress').style.width = progressWidth;
    document.getElementById('migrationText').innerText = migrationStatus;
}
