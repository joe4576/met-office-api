// Wx Section
export interface Param {
  name: string;
  units: string;
  $: string;
}

export interface Wx {
  params: Param[];
}

// DV section
export interface Value {
  D: string | null;
  F: string | null;
  G: string | null;
  H: string | null;
  Pp: string | null;
  S: string | null;
  T: string | null;
  V: string | null;
  W: string | null;
  U: string | null;
  $: string | null;
}

export interface Period {
  type: string;
  value: string;
  Rep: Value[];
}

export interface Location {
  i: string;
  lat: string;
  lon: string;
  name: string;
  country: string;
  continent: string;
  elevation: string;
  Period: Period[];
}

export interface DV {
  dateDate: string;
  type: string;
  Location: Location[];
}

export interface SiteRep {
  Wx: Wx;
  DV: DV;
}

export interface ResponseData {
  SiteRep: SiteRep;
}

// Interfaces for API calls
export interface LatLong {
  name: string;
  lat: string;
  long: string;
}
export interface AllLatLongs {
  latLongs: LatLong[];
}

export interface Observation {
  t: string;
  h: string;
}

export interface FilteredData {
  lt: string;
  lg: string;
  o: Observation[];
}

export interface AllFilteredData {
  time: number;
  data: FilteredData[];
}
