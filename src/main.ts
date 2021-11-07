import express from "express"
import fetch from "node-fetch";
import { MainRequest } from "./types/types";
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

const getData = async () => {
  console.log("getting data... :)");
  const url = `http://datapoint.metoffice.gov.uk/public/data/val/wxobs/all/json/all?res=hourly&key=${process.env.MET_OFFICE_KEY}`
  const request = await fetch(url);
  const result = await request.json();

  if(result) {
    let combined: MainRequest = Object.assign({}, result as MainRequest);
    // get list of all obversable location names
    return combined.SiteRep.DV.Location.map((l) => l.name);
  } else {
    return "Error";
  }
}

app.get('/', async (req, res) => {
  res.send(await getData());
})

app.listen(port, () => {
  console.log(`Listening at http://localhost:${port}`);
})