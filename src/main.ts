import express, { Response } from "express";
import fetch from "node-fetch";
import {
  Location,
  ResponseData,
  Observation,
  AllFilteredData,
} from "./types/types";
import dotenv from "dotenv";
import cors from "cors";
import {
  getDatabase,
  ref,
  set,
  child,
  get,
  push,
  update,
  remove,
  DataSnapshot,
} from "firebase/database";
import { initializeApp } from "firebase/app";
import idsToInclude from "./res/ids.js";

dotenv.config();

const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  projectId: process.env.FIREBAESE_PROJECT_ID,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.FIREBASE_APP_ID,
  databaseURL: process.env.FIREBASE_DATABASE_URL,
};

initializeApp(firebaseConfig);

const app = express();
const port = process.env.PORT || 8080;

const db = getDatabase();

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
  dataType: DataType = DataType.FORECAST
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
          t: r.T ? +r.T : null,
          h: r.H ? +r.H : null,
        };
      });
  };

  if (result) {
    return {
      data: result.SiteRep.DV.Location.filter((location) =>
        idsToInclude.has(+location.i)
      ).map((location) => {
        return {
          lt: +location.lat,
          lg: +location.lon,
          o: getObservations(location),
        };
      }),
      time: Date.now(),
    } as AllFilteredData;
  } else {
    return null;
  }
};

interface HistoricData {
  key: string;
  value: AllFilteredData;
}

/**
 * Middleware to prevent update without an api key header
 */
app.use("/write/", (req, res, next) => {
  const secureHeader = req.headers["super-secure-key"];
  if (!secureHeader || secureHeader !== process.env.API_KEY) {
    res.sendStatus(403);
  } else if (secureHeader === process.env.API_KEY) {
    next();
  }
});

/**
 * Update both forecast and historic data in one api call
 */
app.use("/write/update", async (req, res) => {
  const forecastData = await getFilteredData();

  // Write forcast
  if (forecastData) {
    try {
      await set(ref(db, "forecast"), {
        data: forecastData,
      });
    } catch {
      res.statusMessage = "Error writing to database";
      res.sendStatus(500);
      return;
    }
  } else {
    res.statusMessage = "Error fetching data from met office";
    res.sendStatus(500);
    return;
  }

  // Write historic
  const dbNodeName = "historic";
  let historicDataSnapshot = {} as DataSnapshot;

  // Get data snapshot from db
  try {
    historicDataSnapshot = await get(child(ref(db), dbNodeName));
  } catch {
    res.statusMessage = "Error when accessing database";
    res.sendStatus(500);
    return;
  }

  // Remove the oldest piece of historic data
  if (historicDataSnapshot.val()) {
    const allHistoricData = [] as HistoricData[];
    for (const [key, value] of Object.entries(historicDataSnapshot.val())) {
      allHistoricData.push({ key: key, value: value as AllFilteredData });
    }

    if (allHistoricData.length === 3) {
      const lastKey = allHistoricData[0].key;
      try {
        await remove(ref(db, `/${dbNodeName}/${lastKey}`));
      } catch {
        res.statusMessage = "Error when accessing database";
        res.sendStatus(500);
        return;
      }
    }
  }

  // Write the newest set forecast data to db
  if (forecastData) {
    // only include the next 24 hours
    for (let i = 0; i < forecastData.data.length; i++) {
      forecastData.data[i].o = forecastData.data[i].o.slice(0, 8);
    }

    const nodeKey = push(child(ref(db), dbNodeName)).key;
    const updates: any = {};
    updates[`/${dbNodeName}/` + nodeKey] = forecastData;
    try {
      await update(ref(db), updates);
    } catch {
      res.statusMessage = "Error when accessing database";
      res.sendStatus(500);
      return;
    }

    // Send successful update code
    res.sendStatus(200);
  } else {
    res.statusMessage = "Error fetching data from met office";
    res.sendStatus(500);
  }
});

app.use("/historic-and-forecast", async (req, res) => {
  const dbRef = ref(db);
  let historicData = {} as AllFilteredData;
  let forecastData = {} as AllFilteredData;

  //! historic data
  try {
    const data = await get(child(dbRef, "historic"));
    if (data.exists()) {
      interface DataFromDatabase {
        [key: string]: string | AllFilteredData;
        data: AllFilteredData;
      }
      const dataFromDatabase: DataFromDatabase = data.val();

      /**
       * "Relevant" data is the past 48 hours worth of predictions given in
       * descending order. They are returned in the same format as forecast
       * data, except there will be 16 historical observations from or around
       * the given time.
       */
      historicData = {} as AllFilteredData;

      Object.entries(dataFromDatabase).forEach(([key, value], index) => {
        if (index === 0 || index === 1) {
          historicData.time = (value as AllFilteredData).time;
          if (!historicData.data) {
            historicData.data = (value as AllFilteredData).data;
          } else {
            (value as AllFilteredData).data.forEach((obs, i) => {
              historicData.data[i].o.push(...obs.o);
            });
          }
        }
      });
    } else {
      res.statusMessage = "No historic data found";
      res.sendStatus(404);
    }
  } catch {
    res.statusMessage = "Error when accessing database";
    res.sendStatus(500);
  }

  //! forecast
  try {
    const data = await get(child(dbRef, "forecast/data"));
    if (data.exists()) {
      forecastData = data.val();
    } else {
      res.statusMessage = "No forecast data found";
      res.sendStatus(404);
    }
  } catch {
    res.statusMessage = "Error when accessing database";
    res.sendStatus(500);
  }

  // combine forecast and historic (oldest to most recent)
  historicData.data.forEach((location, index) => {
    location.o.reverse().push(...forecastData.data.map((d) => d.o)[index]);
  });

  // most recent update time
  historicData.time = forecastData.time;

  res.send(historicData);
});

app.listen(port, () => {
  console.log(`Listening at port ${port}`);
});
