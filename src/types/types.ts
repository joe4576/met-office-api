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
  D: string;
  F: string;
  G: string;
  H: string;
  Pp: string;
  S: string;
  T: string;
  V: string;
  W: string;
  U: string;
  $: string;
}

export interface Rep {
  Rep: Value[];
}

export interface Period {
  type: string;
  value: string;
  Rep: Rep[];
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