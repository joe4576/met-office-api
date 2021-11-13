import express from "express";
import fetch from "node-fetch";
import {
  Location,
  ResponseData,
  LatLong,
  AllLatLongs,
  Observation,
  ObservableData,
  AllObversableData,
} from "./types/types";
import dotenv from "dotenv";
// TODO get cors working
// const cors = require("cors")

const app = express();
const port = 8080;

dotenv.config();

const getData = async (
  forecast: boolean = false
): Promise<ResponseData | null> => {
  console.log("getting data... :)");
  const obsUrl = `http://datapoint.metoffice.gov.uk/public/data/val/wxobs/all/json/all?res=hourly&key=${process.env.MET_OFFICE_KEY}`;
  const fcsUrl = `http://datapoint.metoffice.gov.uk/public/data/val/wxfcs/all/json/all?res=3hourly&key=${process.env.MET_OFFICE_KEY}`;
  const request = await fetch(forecast ? fcsUrl : obsUrl);
  const result = (await request.json()) as ResponseData;
  return result || null;
};

const getAllDataExclusingWx = async () => {
  const result = await getData();
  return result ? result.SiteRep.DV : null;
};

const getAllLatLongs = async () => {
  const result = await getData();
  return result
    ? ({
        latLongArray: result.SiteRep.DV.Location.map((l) => {
          return { name: l.name, lat: l.lat, long: l.lon } as LatLong;
        }),
      } as AllLatLongs)
    : null;
};

const getLocationById = async (id: string) => {
  const result = await getData();
  return result
    ? result.SiteRep.DV.Location.find((l) => l.i === id) ?? "Location not found"
    : "Location not found";
};

const getObservableData = async (): Promise<AllObversableData | null> => {
  const result = await getData(true);

  const getObservations = (location: Location): Observation[] => {
    return location.Period.map((p) => p.Rep)
      .flat()
      .map((r) => {
        return {
          temp: r.T ?? "",
          humidity: r.H ?? "",
        };
      });
  };

  return result
    ? ({
        data: result?.SiteRep.DV.Location.map((location) => {
          return {
            lat: location.lat,
            long: location.lon,
            observations: getObservations(location),
          };
        }),
      } as AllObversableData)
    : null;
};

app.get("/", async (req, res) => {
  res.send(await getAllDataExclusingWx());
});

app.get("/latlongs", async (req, res) => {
  res.send(await getAllLatLongs());
});

app.get("/location/:id", async (req, res) => {
  res.send(await getLocationById(req.params.id));
});

app.get("/obs", async (req, res) => {
  const payload = await getObservableData();
  res.send(payload || null);
});

app.listen(port, () => {
  console.log(`Listening at http://localhost:${port}`);
});
