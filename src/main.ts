import express from "express";
import fetch from "node-fetch";
import {
  Location,
  ResponseData,
  AllLatLongs,
  Observation,
  AllFilteredData,
  DV,
} from "./types/types";
import dotenv from "dotenv";
import store from "./state/dataStore.js";
import cors from "cors";

dotenv.config();
const app = express();
const port = process.env.PORT || 8080;

app.use(cors());

enum DataType {
  FORECAST,
  OBSERVATION,
}

/**
 * Fetch data from Met Office API
 * @param dataType Which type of data to get. Defaults to observation
 * @returns JSON object from API response, or null if there are errors
 */
const getDataFromApi = async (
  dataType: DataType = DataType.OBSERVATION
): Promise<ResponseData | null> => {
  console.log("getting data... :)");

  let requestUrl = "";

  switch (dataType) {
    case DataType.FORECAST:
      requestUrl = `http://datapoint.metoffice.gov.uk/public/data/val/wxfcs/all/json/all?res=3hourly&key=${process.env.MET_OFFICE_KEY}`;
      break;
    case DataType.OBSERVATION:
      requestUrl = `http://datapoint.metoffice.gov.uk/public/data/val/wxobs/all/json/all?res=hourly&key=${process.env.MET_OFFICE_KEY}`;
      break;
  }

  let result: ResponseData | null = null;

  try {
    const request = await fetch(requestUrl);
    result = (await request.json()) as ResponseData;
  } catch (e) {
    console.log(`API Error: ${e}`);
  }

  return result;
};

/**
 * Get all data from API, excluding 'Wx'
 * @returns All JSON data excluding 'Wx' property
 */
const getAllDataExcludingWx = async (
  dataType: DataType = DataType.FORECAST
): Promise<DV | null> => {
  const result = await getDataFromApi(dataType);
  return result ? result.SiteRep.DV : null;
};

/**
 * Get all Lat and Long values from each observation site
 * @returns Object containing each observation name, lat and long
 */
const getAllLatLongs = async (): Promise<AllLatLongs | null> => {
  const result = await getDataFromApi();
  return result
    ? ({
        latLongs: result.SiteRep.DV.Location.map((l) => {
          return { name: l.name, lat: l.lat, long: l.lon };
        }),
      } as AllLatLongs)
    : null;
};

/**
 * Get all information stored on a location
 * @param id Observation/location site ID
 * @returns Whole location object of a specified site
 */
const getLocationById = async (id: string): Promise<Location | null> => {
  const result = await getDataFromApi();
  return result
    ? result.SiteRep.DV.Location.find((l) => l.i === id) ?? null
    : null;
};

/**
 * Get filtered data from either data type.
 * @param dataType Which type of data to get. Defaults to observation
 * @returns Filtered data from each location
 */
const getFilteredData = async (
  dataType: DataType = DataType.FORECAST
): Promise<AllFilteredData | null> => {
  const result = await getDataFromApi(dataType);

  const getObservations = (location: Location): Observation[] => {
    return location.Period.map((p) => p.Rep)
      .flat()
      .map((r) => {
        return {
          t: r.T ?? "",
          h: r.H ?? "",
        };
      });
  };

  if (result) {
    return {
      data: result.SiteRep.DV.Location.map((location) => {
        return {
          lt: location.lat,
          lg: location.lon,
          o: getObservations(location),
        };
      }),
    } as AllFilteredData;
  } else {
    return null;
  }
};

app.get("/all/forecast", async (req, res) => {
  const payload = await getAllDataExcludingWx();
  payload ? res.send(payload) : res.sendStatus(400);
});

app.get("/all/obs", async (req, res) => {
  const payload = await getAllDataExcludingWx(DataType.OBSERVATION);
  payload ? res.send(payload) : res.sendStatus(400);
});

app.get("/latlongs", async (req, res) => {
  const payload = await getAllLatLongs();
  payload ? res.send(payload) : res.sendStatus(400);
});

app.get("/location/:id", async (req, res) => {
  const payload = await getLocationById(req.params.id);
  payload ? res.send(payload) : res.sendStatus(400);
});

app.get("/forecast", (req, res) => {
  const payload = store.getForecastStore();
  payload ? res.send(payload) : res.sendStatus(400);
});

app.get("/update", (req, res) => {
  const secureHeader = req.headers["super-secure-key"];

  if (!secureHeader || secureHeader !== process.env.API_KEY) {
    res.sendStatus(403);
  } else if (secureHeader === process.env.API_KEY) {
    // todo: update db
    res.send("Update function called");
  }
});

app.listen(port, () => {
  console.log(`Listening at port ${port}`);
});
