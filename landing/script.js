// BOARDGAMEGEEK API
const BGG_GAME_ID = '4174'; 
const BGG_URL = `https://corsproxy.io/?${encodeURIComponent(`https://boardgamegeek.com/xmlapi/boardgame/${BGG_GAME_ID}`)}`;

async function fetchBGGStats() {
    const controller = new AbortController();
    // Если запрос длится дольше 3 сек, принудительно обрываем его
    const timeoutId = setTimeout(() => controller.abort(), 3000);

    try {
        const response = await fetch(BGG_URL, { signal: controller.signal });
        clearTimeout(timeoutId); // Запрос успел, отменяем таймер

        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const textData = await response.text();
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(textData, "text/xml");
        
        if (xmlDoc.querySelector("parsererror")) throw new Error("Ошибка парсинга XML");
        
        const rating = xmlDoc.querySelector("average")?.getAttribute("value");
        const owners = xmlDoc.querySelector("owned")?.getAttribute("value");
        const year = xmlDoc.querySelector("yearpublished")?.getAttribute("value");
        
        document.getElementById('bgg-rating').innerText = (rating ? parseFloat(rating).toFixed(1) : "6.5") + " / 10";
        document.getElementById('bgg-owners').innerText = owners ? Number(owners).toLocaleString('ru-RU') : "5 200";
        document.getElementById('bgg-year').innerText = year || "2002";
        
    } catch (error) {
        clearTimeout(timeoutId);
        console.warn("BGG API недоступен или медленный, используем резервные данные:", error.message);
        
        // показываем статические данные, чтобы верстка не ломалась
        document.getElementById('bgg-rating').innerText = "6.5 / 10";
        document.getElementById('bgg-owners').innerText = "5 200";
        document.getElementById('bgg-year').innerText = "2002";
        
        const bggError = document.getElementById('bgg-error');
        if (bggError) {
            bggError.style.display = 'block';
            bggError.innerText = "API BoardGameGeek отвечает слишком долго, показаны кэшированные данные.";
        }
    }
}

// 2. OPEN-METEO API
const MARINE_URL = "https://marine-api.open-meteo.com/v1/marine?latitude=30.0&longitude=-40.0&current=wave_height&timezone=GMT";
const WEATHER_URL = "https://api.open-meteo.com/v1/forecast?latitude=30.0&longitude=-40.0&current=wind_speed_10m&timezone=GMT";

function getMarineStatus(waveHeight, windSpeed) {
    if (waveHeight > 3.0 || windSpeed > 15) {
        return { text: "ШТОРМ! Высокий риск оказаться за бортом! Держись!", className: "err" };
    } else if (waveHeight > 1.5) {
        return { text: "Умеренная зыбь. Самое время проверить припасы.", className: "info" };
    } else if (windSpeed < 3) {
        return { text: "Штиль. Придётся грести (готовься к жажде!).", className: "warning" };
    } else {
        return { text: "Попутный ветер. Наслаждайтесь плаванием.", className: "success" };
    }
}

async function fetchMarineWeather() {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

    const waveEl = document.getElementById('wave');
    const windEl = document.getElementById('wind');
    const statusEl = document.getElementById('sea-status');
    
    waveEl.innerHTML = '— <small>м</small>';
    windEl.innerHTML = '— <small>м/с</small>';
    statusEl.innerText = "Связь с капитанским мостиком...";
    statusEl.className = "status info";
    
    try {
        const [marineRes, weatherRes] = await Promise.all([
            fetch(MARINE_URL, { signal: controller.signal }),
            fetch(WEATHER_URL, { signal: controller.signal })
        ]);
        clearTimeout(timeoutId);
        
        if (!marineRes.ok || !weatherRes.ok) throw new Error("Сбой сети");
        
        const marineData = await marineRes.json();
        const weatherData = await weatherRes.json();
        
        const wave = marineData.current.wave_height;
        const wind = weatherData.current.wind_speed_10m;
        
        waveEl.innerHTML = `${wave.toFixed(1)} <small>м</small>`;
        windEl.innerHTML = `${wind.toFixed(1)} <small>м/с</small>`;
        
        const status = getMarineStatus(wave, wind);
        statusEl.innerText = status.text;
        statusEl.className = `status ${status.className}`;
        
    } catch (error) {
        clearTimeout(timeoutId);
        console.error("Ошибка загрузки погоды:", error.message);
        statusEl.innerText = "Радиомолчание. Чайки перехватили сигнал 📡";
        statusEl.className = "status err";
    }
}

document.addEventListener('DOMContentLoaded', () => {
    fetchBGGStats();
    fetchMarineWeather();
    
    document.getElementById('refresh').addEventListener('click', fetchMarineWeather);
});