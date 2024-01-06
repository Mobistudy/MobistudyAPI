import * as Types from '../../models/jsdocs.js'
import axios from 'axios'
import getConfig from './config.mjs'

const config = getConfig()

const OWMapiKey = config.environmentAPIs.OpenWeatherMap
const AMBEEKey = config.environmentAPIs.Ambee


/**
 * Gets the current weather of a given location
 * @param {number} lat - latitude
 * @param {number} long - longitude
 * @returns {Promise<Types.Weather>}
 */
export async function getWeather (lat, long) {
  const queryString = 'https://api.openweathermap.org/data/2.5/weather?lon=' + long + '&lat=' + lat + '&appid=' + OWMapiKey
  const resp = await axios.get(queryString)
  return {
    location: resp.data.name,
    description: resp.data.weather[0].description,
    icon: 'https://openweathermap.org/img/w/' + resp.data.weather[0].icon + '.png',
    temperature: resp.data.main.temp - 273.15,
    temperatureFeels: resp.data.main.feels_like - 273.15,
    temperatureMin: resp.data.main.temp_min - 273.15,
    temperatureMax: resp.data.main.temp_max - 273.15,
    pressure: resp.data.main.pressure,
    humidity: resp.data.main.humidity,
    sunrise: new Date(resp.data.sys.sunrise * 1000),
    sunset: new Date(resp.data.sys.sunset * 1000),
    clouds: resp.data.clouds.all,
    wind: resp.data.wind
  }
}

/**
 * Gets the name and other characteristics of the location
 * @param {number} lat - latitude
 * @param {number} long - longitude
 * @returns {Promise<Types.Location>}
 */
export async function getLocation (lat, long) {
  const postcodeLimit = 1
  const queryString = 'https://api.postcodes.io/postcodes?lon=' + long + '&lat=' + lat + '&limit=' + postcodeLimit
  const resp = await axios.get(queryString)
  if (resp.data.result) {
    return {
      postcode: resp.data.result[0].postcode,
      country: resp.data.result[0].country,
      place: resp.data.result[0].parish
    }
  } else return undefined
}

/**
 * Gets the info about pollution
 * @param {number} lat - latitude
 * @param {number} long - longitude
 * @returns {Promise<Types.Pollution>}
 */
export async function getPollution (lat, long) {
  const queryString = 'https://api.openweathermap.org/data/2.5/air_pollution?lon=' + long + '&lat=' + lat + '&appid=' + OWMapiKey
  const resp = await axios.get(queryString)
  return {
    aqi: resp.data.list[0].main.aqi,
    components: resp.data.list[0].components
  }
}

export async function getAllergenes (lat, long) {
  const options = {
    method: 'GET',
    url: 'https://api.ambeedata.com/latest/pollen/by-lat-lng',
    params: { lat: lat, lng: long },
    headers: { 'x-api-key': AMBEEKey, 'Content-type': 'application/json' }
  }
  const resp = await axios.request(options)
  return {
    pollen: resp.data.data[0]
  }
}
