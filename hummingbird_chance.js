async function updateAllData() {
    document.getElementById('loading').classList.remove('hidden');

    navigator.geolocation.getCurrentPosition(async (pos) => {
        const { latitude: lat, longitude: lon } = pos.coords;
        
        try {
            // 1. Fetch EVERYTHING from your Vercel backend in one go
            const res = await fetch(`/api/hummers?lat=${lat}&lon=${lon}`);
            const data = await res.json();

            // 2. Run the UI logic for Weather and Birds
            if (data.weather) {
                processWeather(data.weather);
            }
            if (data.birds) {
                processSpecies(data.birds);
            }

        } catch (e) {
            console.error("Backend error:", e);
            alert("Could not load data from the server.");
        }
        
        document.getElementById('loading').classList.add('hidden');
    }, () => {
        alert("Could not get location. Try enabling GPS!");
        document.getElementById('loading').classList.add('hidden');
    });
}

function processWeather(data) {
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
    
    updateScoreUI(Math.max(5, Math.min(99, score)), data.current.condition.text, timeNote);
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
            const wikiRes = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${h.comName.replace(/ /g, '_')}`);
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

function updateScoreUI(score, cond, timeNote) {
    const circle = document.getElementById('probCircle');
    const circumference = 2 * Math.PI * 80;
    circle.style.strokeDashoffset = circumference - (score / 100) * circumference;
    document.getElementById('probPercent').innerText = score + "%";

    document.getElementById('weatherSummary').innerHTML = `
        <div class="mb-1">It's ${cond.toLowerCase()} right now.</div>
        <div class="text-xs font-bold text-green-700">${timeNote}</div>
    `;

    const month = new Date().getMonth();
    document.getElementById('migrationProgress').style.width = (month > 2 && month < 10) ? "90%" : "20%";
    document.getElementById('migrationText').innerText = (month > 2 && month < 10) ? "Peak Season is active!" : "Off-season. Sightings are rare.";
}
