# Met Office API

This is an API that processes Met Office forecast data of over 6000 locations and, for each location, returns the lat, long and temperature + humidity in 3 hour intervals for the following 24 hours.

Calls to the Met Office forecast API are made by sending a request to the secure `update` endpoint, where data is processed and then stored in a database.

There are 2 databases - one with historial forecasts, and another with the most recent forecast.

## Development

- `tsc -w` to ensure all ts files are compiled
- `npm run dev` to run the local dev server
