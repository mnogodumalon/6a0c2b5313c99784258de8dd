// AUTOMATICALLY GENERATED TYPES - DO NOT EDIT

export type LookupValue = { key: string; label: string };
export type GeoLocation = { lat: number; long: number; info?: string };

export interface Speisen {
  record_id: string;
  createdat: string;
  updatedat: string | null;
  fields: {
    name?: string;
    preis?: number;
    kategorie?: LookupValue;
  };
}

export interface Tische {
  record_id: string;
  createdat: string;
  updatedat: string | null;
  fields: {
    tischnummer?: string;
    bemerkung?: string;
  };
}

export interface Bestellungen {
  record_id: string;
  createdat: string;
  updatedat: string | null;
  fields: {
    tisch?: string; // applookup -> URL zu 'Tische' Record
    positionen?: string; // applookup -> URL zu 'Speisen' Record
    bestellzeit?: string; // Format: YYYY-MM-DD oder ISO String
    trinkgeld?: number;
    gesamt?: number;
    bezahlt?: boolean;
  };
}

export const APP_IDS = {
  SPEISEN: '6a0c2b3d9f199babf80832d4',
  TISCHE: '6a0c2b41f8c0e3c711f12e3f',
  BESTELLUNGEN: '6a0c2b42d7ff8d6335b2f8db',
} as const;


export const LOOKUP_OPTIONS: Record<string, Record<string, {key: string, label: string}[]>> = {
  'speisen': {
    kategorie: [{ key: "speise", label: "Speise" }, { key: "getraenk", label: "Getränk" }],
  },
};

export const FIELD_TYPES: Record<string, Record<string, string>> = {
  'speisen': {
    'name': 'string/text',
    'preis': 'number',
    'kategorie': 'lookup/radio',
  },
  'tische': {
    'tischnummer': 'string/text',
    'bemerkung': 'string/text',
  },
  'bestellungen': {
    'tisch': 'applookup/select',
    'positionen': 'applookup/select',
    'bestellzeit': 'date/datetimeminute',
    'trinkgeld': 'number',
    'gesamt': 'number',
    'bezahlt': 'bool',
  },
};

type StripLookup<T> = {
  [K in keyof T]: T[K] extends LookupValue | undefined ? string | LookupValue | undefined
    : T[K] extends LookupValue[] | undefined ? string[] | LookupValue[] | undefined
    : T[K];
};

// Helper Types for creating new records (lookup fields as plain strings for API)
export type CreateSpeisen = StripLookup<Speisen['fields']>;
export type CreateTische = StripLookup<Tische['fields']>;
export type CreateBestellungen = StripLookup<Bestellungen['fields']>;