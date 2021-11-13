import express from "express";
import fetch from "node-fetch";
import { ResponseData } from "./types/types";
import dotenv from "dotenv";
// TODO get cors working
// const cors = require("cors")

const app = express();
const port = 8080;

dotenv.config();

/**
 * SiteRep
 *  Wx
 *    param
 *      H - screen relative humidity
 *      T - temperature
 *  DV
 *    dateDate: instant
 *    type: "Forecase"
 *    "Location"
 *      i: id of country
 *      lat
 *      long
 *      name
 *      country
 *      continent
 *      elevation
 *      Period
 *        type
 *        value: day in format 2021-11-07Z
 *        Rep (ranges from 5 to 8 - 8 being every 3 hours)12.
 *          array of: F, F, G, H, Pp, S, T, V, W, U, $
 */

interface LatLong {
  name: string;
  lat: string;
  long: string;
}
interface AllLatLongs {
  latLongArray: LatLong[];
}

const getData = async (): Promise<ResponseData | null> => {
  console.log("getting data... :)");
  const url = `http://datapoint.metoffice.gov.uk/public/data/val/wxobs/all/json/all?res=hourly&key=${process.env.MET_OFFICE_KEY}`;
  const request = await fetch(url);
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

app.get("/", async (req, res) => {
  res.send(await getAllDataExclusingWx());
});

app.get("/latlongs", async (req, res) => {
  res.send(await getAllLatLongs());
});

app.get("/location/:id", async (req, res) => {
  res.send(await getLocationById(req.params.id));
});

app.listen(port, () => {
  console.log(`Listening at http://localhost:${port}`);
});
