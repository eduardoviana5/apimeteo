const express = require('express');
const axios = require('axios');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

let historyStore = [];

async function serviceGeocoding(cityName) {
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(cityName)}&count=10&language=pt&format=json`;
  try {
    const response = await axios.get(url, { timeout: 5000 });
    if (!response.data.results || response.data.results.length === 0) {
      return null;
    }
    
    // Retorna exatamente o resultado padrão da API Open-Meteo
    return response.data.results;
  } catch (error) {
    throw new Error('502_GEOCODING_FAIL');
  }
}

async function serviceWeather(latitude, longitude) {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,apparent_temperature,weather_code,wind_speed_10m,wind_direction_10m,is_day&daily=weather_code,temperature_2m_max,temperature_2m_min,uv_index_max&timezone=auto`;
  try {
    const response = await axios.get(url, { timeout: 5000 });
    return response.data;
  } catch (error) {
    throw new Error('502_WEATHER_FAIL');
  }
}

app.get('/api/geocoding', async (req, res) => {
  const { busca } = req.query;
  if (!busca || busca.trim().length < 1) {
    return res.status(400).json({ status: 400, erro: 'Digite ao menos 1 caractere.' });
  }

  try {
    const locations = await serviceGeocoding(busca);
    if (!locations) {
      return res.status(404).json({ status: 404, erro: 'Local não encontrado.' });
    }
    return res.json(locations);
  } catch (error) {
    return res.status(502).json({ status: 502, erro: 'Erro de comunicação externa.' });
  }
});

app.get('/api/clima', async (req, res) => {
  const { cidade } = req.query;

  if (!cidade || cidade.trim().length < 1 || cidade.length > 100) {
    return res.status(400).json({ status: 400, erro: 'Erro 400: Cidade inválida ou campo em branco.' });
  }

  try {
    const locations = await serviceGeocoding(cidade);
    if (!locations) {
      return res.status(404).json({ status: 404, erro: 'Local não encontrado.' });
    }

    const selectedCity = locations[0];
    const weatherData = await serviceWeather(selectedCity.latitude, selectedCity.longitude);

    historyStore = [
      { name: selectedCity.name, country: selectedCity.country, lat: selectedCity.latitude, lon: selectedCity.longitude },
      ...historyStore.filter(item => item.name.toLowerCase() !== selectedCity.name.toLowerCase())
    ].slice(0, 5);

    return res.status(200).json({
      status: 200,
      cidade: {
        nome: selectedCity.name,
        estado: selectedCity.admin1 || '',
        pais: selectedCity.country,
        latitude: selectedCity.latitude,
        longitude: selectedCity.longitude
      },
      todasLocalidadesHomonimas: locations,
      meteorologia: weatherData,
      historico: historyStore
    });

  } catch (error) {
    if (error.message.includes('502')) {
      return res.status(502).json({ status: 502, erro: 'Timeout ou falha na API externa.' });
    }
    return res.status(500).json({ status: 500, erro: 'Erro interno do servidor.' });
  }
});

app.get('/api/historico', (req, res) => {
  res.json(historyStore);
});

app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
}); 