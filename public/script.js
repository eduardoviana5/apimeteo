let chartInstance = null;
let primaryCity = null;
let primaryWeatherData = null;
let secondaryCity = null;
let secondaryWeatherData = null;
let debounceTimer = null;

const wmoIcons = {
  0: '☀️', 1: '🌤️', 2: '⛅', 3: '☁️',
  45: '🌫️', 48: '🌫️',
  51: '🌦️', 53: '🌦️', 55: '🌧️', 56: '🌧️', 57: '🌧️',
  61: '🌦️', 63: '🌧️', 65: '🌧️', 66: '🌧️', 67: '🌧️',
  71: '🌨️', 73: '❄️', 75: '❄️', 77: '❄️',
  80: '🌦️', 81: '🌧️', 82: '🌧️', 85: '🌨️', 86: '❄️',
  95: '🌩️', 96: '⛈️', 99: '⛈️'
};

const cityInput = document.getElementById('city-input');
const autocompleteList = document.getElementById('autocomplete-list');

cityInput.addEventListener('input', () => {
  clearTimeout(debounceTimer);
  const query = cityInput.value.trim();

  if (query.length < 1) {
    autocompleteList.classList.add('hidden');
    return;
  }

  debounceTimer = setTimeout(async () => {
    try {
      const res = await fetch(`/api/geocoding?busca=${encodeURIComponent(query)}`);
      if (!res.ok) {
        autocompleteList.classList.add('hidden');
        return;
      }
      const locations = await res.json();
      renderAutocomplete(locations);
    } catch (err) {
      console.error(err);
    }
  }, 250);
});

function renderAutocomplete(locations) {
  autocompleteList.innerHTML = '';
  autocompleteList.classList.remove('hidden');

  locations.forEach(loc => {
    const item = document.createElement('div');
    item.className = 'autocomplete-item';
    item.innerText = `${loc.name}, ${loc.admin1 || ''} - ${loc.country}`;
    item.onclick = () => {
      cityInput.value = loc.name;
      autocompleteList.classList.add('hidden');
      executeSearch(loc.name);
    };
    autocompleteList.appendChild(item);
  });
}

document.addEventListener('click', (e) => {
  if (!e.target.closest('.autocomplete-wrapper')) {
    autocompleteList.classList.add('hidden');
  }
});

document.getElementById('btn-search').addEventListener('click', () => {
  const query = cityInput.value.trim();
  if (query.length < 1) {
    return alert('Erro 400: O campo de busca está vazio ou inválido.');
  }
  executeSearch(query);
});

async function executeSearch(cityName, isComparison = false) {
  try {
    const response = await fetch(`/api/clima?cidade=${encodeURIComponent(cityName)}`);
    const data = await response.json();

    if (response.status === 400) return alert(`Erro 400: ${data.erro}`);
    if (response.status === 404) return alert(`Erro 404: Local '${cityName}' não encontrado.`);
    if (response.status === 502) return alert(`Erro 502: Falha na API de meteorologia.`);

    if (isComparison) {
      secondaryCity = data.cidade;
      secondaryWeatherData = data.meteorologia;
    } else {
      primaryCity = data.cidade;
      primaryWeatherData = data.meteorologia;
      secondaryCity = null;
      secondaryWeatherData = null;
    }

    renderAll(data.historico);
    document.getElementById('homonyms-container').classList.add('hidden');

  } catch (err) {
    alert('Erro ao conectar com o servidor.');
  }
}

function renderAll(historico) {
  document.getElementById('weather-section').classList.remove('hidden');

  const lastUpdatedEl = document.getElementById('last-updated');
  if (lastUpdatedEl) {
    const agora = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    lastUpdatedEl.innerText = `Última atualização: ${agora}`;
  }

  updateThemeBackground(primaryWeatherData.current);
  renderHistoryAndCompareUI(historico);
  renderWeatherPanels();
}

function updateThemeBackground(current) {
  const code = Number(current.weather_code);
  const isDay = current.is_day !== undefined ? Number(current.is_day) === 1 : true;
  const body = document.body;
  body.className = '';

  if (!isDay) body.classList.add('theme-night');

  if (code >= 95) body.classList.add('theme-thunder');
  else if ([71, 73, 75, 77, 85, 86].includes(code)) body.classList.add('theme-snowy');
  else if ([55, 57, 63, 65, 66, 67, 81, 82].includes(code)) body.classList.add('theme-rainy');
  else if ([51, 53, 61, 80].includes(code)) body.classList.add('theme-sunny');
  else if ([45, 48].includes(code)) body.classList.add('theme-foggy');
  else if ([2, 3].includes(code)) body.classList.add('theme-cloudy');
  else if (isDay && [0, 1].includes(code)) body.classList.add('theme-sunny');
  else if ([0, 1].includes(code)) body.classList.add('theme-night');

  const layer = document.getElementById('weather-animation-bg');
  layer.innerHTML = '';
  const add = (className, styles = {}) => {
    const element = document.createElement('span');
    element.className = className;
    Object.assign(element.style, styles);
    layer.appendChild(element);
  };

  if (isDay && [0, 1, 51, 53, 61, 80].includes(code)) add('sun');

  if (!isDay) {
    add('moon');
    const stars = document.createElement('div');
    stars.className = 'stars';
    for (let i = 0; i < 48; i++) {
      const star = document.createElement('i');
      star.className = 'star';
      star.style.left = `${Math.random() * 100}%`;
      star.style.top = `${Math.random() * 72}%`;
      star.style.animationDelay = `${Math.random() * 3}s`;
      stars.appendChild(star);
    }
    layer.appendChild(stars);
  }

  if ([2, 3, 45, 48, 51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82, 95, 96, 99].includes(code)) {
    add('cloud c1');
    add('cloud c2');
    add('cloud c3');
  }

  if ([55, 57, 63, 65, 66, 67, 81, 82, 95, 96, 99].includes(code)) {
    const count = window.innerWidth < 600 ? 45 : 90;
    for (let i = 0; i < count; i++) {
      add('rain', {
        left: `${Math.random() * 105}%`,
        animationDelay: `${Math.random() * -1.5}s`,
        animationDuration: `${0.55 + Math.random() * 0.5}s`,
        opacity: `${0.25 + Math.random() * 0.65}`
      });
    }
  }

  if ([71, 73, 75, 77, 85, 86].includes(code)) {
    const count = window.innerWidth < 600 ? 45 : 85;
    for (let i = 0; i < count; i++) {
      add('snow', {
        left: `${Math.random() * 100}%`,
        animationDelay: `${Math.random() * -9}s`,
        animationDuration: `${6 + Math.random() * 8}s`,
        opacity: `${0.4 + Math.random() * 0.6}`
      });
    }
  }

  if (code >= 95) add('lightning');
}

function renderWeatherPanels() {
  const wrapper = document.getElementById('comparison-wrapper');
  wrapper.innerHTML = '';

  const title = secondaryCity 
    ? `Comparativo: ${primaryCity.nome} vs ${secondaryCity.nome}` 
    : `Clima em ${primaryCity.nome}`;
  document.getElementById('panel-title').innerText = title;

  wrapper.appendChild(createCityCard(primaryCity, primaryWeatherData));

  if (secondaryCity && secondaryWeatherData) {
    wrapper.appendChild(createCityCard(secondaryCity, secondaryWeatherData));
  }

  const labels = primaryWeatherData.daily.time.slice(0, 5);
  const datasets = [
    {
      label: `${primaryCity.nome} - Máx (°C)`,
      data: primaryWeatherData.daily.temperature_2m_max.slice(0, 5),
      borderColor: '#f39c12',
      backgroundColor: 'rgba(243, 156, 18, 0.1)',
      fill: true
    },
    {
      label: `${primaryCity.nome} - Mín (°C)`,
      data: primaryWeatherData.daily.temperature_2m_min.slice(0, 5),
      borderColor: '#2980b9',
      backgroundColor: 'transparent',
      fill: false
    }
  ];

  if (secondaryCity && secondaryWeatherData) {
    datasets.push(
      {
        label: `${secondaryCity.nome} - Máx (°C)`,
        data: secondaryWeatherData.daily.temperature_2m_max.slice(0, 5),
        borderColor: '#e67e22',
        borderDash: [5, 5],
        fill: false
      },
      {
        label: `${secondaryCity.nome} - Mín (°C)`,
        data: secondaryWeatherData.daily.temperature_2m_min.slice(0, 5),
        borderColor: '#3498db',
        borderDash: [5, 5],
        fill: false
      }
    );
  }

  renderChart(labels, datasets);
}

function createCityCard(cidade, meteo) {
  const col = document.createElement('div');
  col.className = 'city-weather-column';

  const current = meteo.current;
  let forecastHtml = '';

  meteo.daily.time.slice(0, 5).forEach((day, i) => {
    const max = Math.round(meteo.daily.temperature_2m_max[i]);
    const min = Math.round(meteo.daily.temperature_2m_min[i]);
    const icon = wmoIcons[meteo.daily.weather_code[i]] || '🌡️';

    const dateObj = new Date(day + 'T00:00:00');
    let weekDay = dateObj.toLocaleDateString('pt-BR', { weekday: 'short' });
    weekDay = weekDay.charAt(0).toUpperCase() + weekDay.slice(1);
    const dayMonth = dateObj.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });

    forecastHtml += `
      <div class="forecast-card">
        <div><strong>${weekDay}, ${dayMonth}</strong></div>
        <div style="font-size:18px;">${icon}</div>
        <div><span style="color:#f39c12">${max}°</span></div>
        <div><span style="color:#2980b9">${min}°</span></div>
      </div>
    `;
  });

  col.innerHTML = `
    <h3>${cidade.nome}, ${cidade.estado || ''} (${cidade.pais})</h3>
    <p class="coords">Lat: ${cidade.latitude.toFixed(2)} | Lon: ${cidade.longitude.toFixed(2)}</p>
    
    <div class="current-flex">
      <div class="temp-box">
        <span class="weather-icon">${wmoIcons[current.weather_code] || '🌡️'}</span>
        <span class="temp">${Math.round(current.temperature_2m)}°C</span>
      </div>
      <div>
        <p style="margin:2px 0;">Sensação: <strong>${Math.round(current.apparent_temperature)}°C</strong></p>
        <p style="margin:2px 0;">Vento: ${current.wind_speed_10m} km/h</p>
        <p style="margin:2px 0;">Índice UV: ${meteo.daily.uv_index_max ? meteo.daily.uv_index_max[0] : '--'}</p>
      </div>
    </div>

    <hr style="margin: 12px 0;" />
    <strong style="font-size:12px;">Próximos 5 dias:</strong>
    <div class="forecast-grid">${forecastHtml}</div>
  `;

  return col;
}

function renderChart(labels, datasets) {
  const ctx = document.getElementById('tempChart').getContext('2d');
  if (chartInstance) chartInstance.destroy();

  chartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels.map(d => new Date(d + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })),
      datasets: datasets
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'bottom', labels: { usePointStyle: true, padding: 18, font: { family: 'system-ui', size: 11 } } },
        tooltip: { backgroundColor: 'rgba(20,32,52,.92)', padding: 12, cornerRadius: 10 }
      },
      interaction: { intersect: false, mode: 'index' },
      elements: { line: { tension: .38, borderWidth: 3 }, point: { radius: 4, hoverRadius: 7, borderWidth: 2 } },
      scales: {
        x: { grid: { display: false }, ticks: { color: '#718096' } },
        y: { grid: { color: 'rgba(120,140,160,.15)' }, ticks: { color: '#718096', callback: value => `${value}°` } }
      }
    }
  });
}

function renderHistoryAndCompareUI(historico) {
  const historyList = document.getElementById('history-list');
  const compareContainer = document.getElementById('compare-buttons-container');
  const compareCard = document.getElementById('compare-selection-card');

  historyList.innerHTML = '';
  compareContainer.innerHTML = '';

  if (historico.length > 1 && primaryCity) {
    compareCard.classList.remove('hidden');
  } else {
    compareCard.classList.add('hidden');
  }

  historico.forEach(item => {
    const btn = document.createElement('button');
    btn.className = 'tag-btn';
    btn.innerText = `${item.name} (${item.country})`;
    btn.onclick = () => executeSearch(item.name);
    historyList.appendChild(btn);

    if (primaryCity && item.name.toLowerCase() !== primaryCity.nome.toLowerCase()) {
      const cBtn = document.createElement('button');
      cBtn.className = 'compare-btn';
      cBtn.innerText = `+ Comparar com ${item.name}`;
      cBtn.onclick = () => executeSearch(item.name, true);
      compareContainer.appendChild(cBtn);
    }
  });
}

document.getElementById('btn-refresh').addEventListener('click', () => {
  if (primaryCity) executeSearch(primaryCity.nome);
});