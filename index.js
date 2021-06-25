/*
Prenaam DOLOU Gozem Test
Retrieve country names, UTC offset, distance and time difference from 2 geolocation data
For the sake of this test, I will include the .env file in the github repository
*/

// import module
require('dotenv').config(); // to access environment variables like API key. 
var express = require('express');
const path = require('path');
const axios = require('axios'); // for fetch requests management
var momentZone = require('moment-timezone'); // for more offset computation
var app = express();

var baseUrl = "https://maps.googleapis.com/maps/api/"; // google maps API base url

/**
 * Returns the url to request information about a geolocation Place from Google Maps API.
 *
 * @param {object} geolocation The geolocation object to get info about.
 * @return {String} googleAPIRequest_Url The URL to use for the request.
 */
function createGetCountryURL(geolocation){
    const lat = geolocation.lat; // geolocation latitude
    const lng = geolocation.lng; // geolocation longitude
    var apiUrlwithparams = baseUrl + "geocode/json?latlng=" + lat + "," + lng;  // add parameters
    var googleAPIRequest_Url = apiUrlwithparams + "&result_type=country&key=" + process.env.GOOGLE_API_KEY; //add filer and key
    return googleAPIRequest_Url;
}

/**
 * Returns the url to request information about a geolocation Time Zone from Google Maps API.
 *
 * @param {object} geolocation The geolocation object to get info about.
 * @return {String} googleAPIRequest_Url The URL to use for the request.
 */
function createGetTimeURL(geolocation){
    const lat = geolocation.lat; // geolocation latitude
    const lng = geolocation.lng; // geolocation longitude
    var apiUrlwithparams = baseUrl + "timezone/json?location=" + lat + "," + lng + "&timestamp=" + (Math.floor(Date.now() / 1000)).toString(); // add parameters and timeStamp
    var googleAPIRequest_Url = apiUrlwithparams + "&key=" + process.env.GOOGLE_API_KEY; // add key
    return googleAPIRequest_Url;
}

/**
 * Returns the url to request distance between 2 geolocations from Google Maps API.
 *
 * @param {object} geolocation1 The geolocation object of the origin.
 * @param {object} geolocation2 The geolocation object of the destination.
 * @return {String} googleAPIRequest_Url The URL to use for the request.
 */
function createGetDistanceURL(geolocation1, geolocation2){
    var apiUrlwithparams = baseUrl + "distancematrix/json?origins=" + geolocation1.lat + "," + geolocation1.lng + 
                                                   "&destinations=" + geolocation2.lat + "," + geolocation2.lng; // add origin and destination coordinates parameters
    var googleAPIRequest_Url = apiUrlwithparams + "&key=" + process.env.GOOGLE_API_KEY; // add key
    return googleAPIRequest_Url;
}

/**
 * Returns the int value of the corresponding string offset in the format +08:00 or -08:00.
 *
 * @param {string} offsetString The formatted offset string.
 * @return {number} offset The int value of the offset.
 */
function parseUTCOffset(offsetString){
    var offset = parseInt(offsetString.slice(0, -3)); // removing last 3 characters
    return offset;
}

/**
 * Returns the distance between 2 geolocations from Google Maps API.
 * since API key provided kept returning "This API key is not authorized to use this service or API."
 * Error Obtained with https://maps.googleapis.com/maps/api/distancematrix/json?origins=heading=90:37.773279,-122.468780&destinations=37.773245,-122.469502&key=AIzaSyBrRh0NjtrSopoOrG-4_W3OP0nmzSDQK-M
 * I used this method from Google Cloud Map https://cloud.google.com/blog/products/maps-platform/how-calculate-distances-map-maps-javascript-api
 *
 * @param {object} geolocation1 The geolocation object of the origin.
 * @param {object} geolocation2 The geolocation object of the destination.
 * @return {number} d the actual distance in kilometers.
 */
function haversine_distance(geolocation1, geolocation2) {
    var R = 6371.0710; // Radius of the Earth in Km
    var rlat1 = geolocation1.lat * (Math.PI/180); // Convert degrees to radians
    var rlat2 = geolocation2.lat * (Math.PI/180); // Convert degrees to radians
    var difflat = rlat2-rlat1; // Radian difference (latitudes)
    var difflon = (geolocation2.lng-geolocation1.lng) * (Math.PI/180); // Radian difference (longitudes)
    var d = 2 * R * Math.asin(Math.sqrt(Math.sin(difflat/2)*Math.sin(difflat/2)+Math.cos(rlat1)*Math.cos(rlat2)*Math.sin(difflon/2)*Math.sin(difflon/2)));
    return d;
  }


// homepage to return the HTML page from which to send the geolocations coordinate to process
app.get('/', function(req, res){
   res.sendFile(path.join(__dirname, '/index.html'));
});

// the actual handling of the geolocations sent
app.get('/api/get_distance_and_time', async function(req, res){
    // get geolocation1 coordinates from url parameters
    var lat1 = req.query.lat1; 
    var lng1 = req.query.lng1; 
    var geolocation1 = {'lat': lat1, 'lng': lng1};

    // get geolocation2 coordinates from url parameters
    var lat2 = req.query.lat2; 
    var lng2 = req.query.lng2; 
    var geolocation2 = {'lat': lat2, 'lng': lng2};
    
    // Build all the request urls
    var geolocation1CountryURL = createGetCountryURL(geolocation1); // for origin country
    var geolocation2CountryURL = createGetCountryURL(geolocation2); // for destination country
    var geolocation1TimeURL = createGetTimeURL(geolocation1); // for origin time zone
    var geolocation2TimeURL = createGetTimeURL(geolocation2); // for destination time zone
    var distanceURL = createGetDistanceURL(geolocation1, geolocation2); // for distance between geolocation1 and geolocation2
    
    const distanceKm = haversine_distance(geolocation1, geolocation2); // compute distance from haversine method

    // initialize requests
    const country1Request = axios.get(geolocation1CountryURL);
    const country2Request = axios.get(geolocation2CountryURL);
    const time1Request = axios.get(geolocation1TimeURL);
    const time2Request = axios.get(geolocation2TimeURL);

    // make requests
    axios.all([country1Request, country2Request, time1Request, time2Request]).then(axios.spread((...responses) => {
        const country1 = responses[0].data.results[0].formatted_address; // get origin country name 
        const country2 = responses[1].data.results[0].formatted_address; // get destination country name 
        const time1 = parseUTCOffset(momentZone().tz(responses[2].data.timeZoneId).format('Z')); // get origin time zone
        const time2 = parseUTCOffset(momentZone().tz(responses[3].data.timeZoneId).format('Z')); // get destination time zone

        // build json object to return
        var result_data = {
            start: {
                country: country1,
                timezone: "GMT" + ((time1 >= 0)?("+" + time1.toString()):time1.toString()), // format display to be consistent with example
                location: { lat: geolocation1.lat, lng: geolocation1.lng },
                },
            end: {
                country: country2,
                timezone: "GMT" + ((time2 >= 0)?("+" + time2.toString()):time2.toString()), // format display to be consistent with example
                location: { lat: geolocation2.lat, lng: geolocation2.lng },
            },
            distance: {
                value: Math.round(distanceKm), // round distance to nearest km
                units: "km"
            },
            time_diff: {
                value: Math.abs(time2 - time1), 
                units: "hours"
            }            
        }    
        
        console.log(result_data)
        return res.json(result_data);
      })).catch(errors => {
        console.log(errors);
        return res.json({'errors': errors})
      })
});

app.listen(3000);