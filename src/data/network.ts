export interface StationSeed {
  id: string;
  name: string;
  lat: number;
  lng: number;
}

export const STATIONS: StationSeed[] = [
  { id: "CSMT", name: "CSMT Mumbai", lat: 18.9398, lng: 72.8354 },
  { id: "PNVL", name: "Panvel", lat: 18.9934, lng: 73.1135 },
  { id: "PUNE", name: "Pune Junction", lat: 18.528, lng: 73.8742 },
  { id: "KALYAN", name: "Kalyan Junction", lat: 19.2403, lng: 73.1305 },
  { id: "THANE", name: "Thane", lat: 19.1843, lng: 72.9781 },
  { id: "NASIK", name: "Nashik Road", lat: 19.9975, lng: 73.7898 },
  { id: "IGATPURI", name: "Igatpuri", lat: 19.6943, lng: 73.5572 },
  { id: "DADAR", name: "Dadar", lat: 19.0186, lng: 72.8425 },
  { id: "LONAVALA", name: "Lonavala", lat: 18.7493, lng: 73.4033 },
  { id: "VASAI", name: "Vasai Road", lat: 19.3653, lng: 72.8355 },
  { id: "SURAT", name: "Surat", lat: 21.1702, lng: 72.8311 },
  { id: "BARODA", name: "Vadodara", lat: 22.3072, lng: 73.1812 },
];

export interface SegmentSeed {
  id: string;
  from: string;
  to: string;
}

export const SEGMENT_SEEDS: SegmentSeed[] = [
  { id: "SEG-01", from: "CSMT", to: "DADAR" },
  { id: "SEG-02", from: "DADAR", to: "THANE" },
  { id: "SEG-03", from: "THANE", to: "KALYAN" },
  { id: "SEG-04", from: "KALYAN", to: "IGATPURI" },
  { id: "SEG-05", from: "IGATPURI", to: "NASIK" },
  { id: "SEG-06", from: "KALYAN", to: "LONAVALA" },
  { id: "SEG-07", from: "LONAVALA", to: "PUNE" },
  { id: "SEG-08", from: "DADAR", to: "VASAI" },
  { id: "SEG-09", from: "VASAI", to: "SURAT" },
  { id: "SEG-10", from: "SURAT", to: "BARODA" },
  { id: "SEG-11", from: "CSMT", to: "PNVL" },
  { id: "SEG-12", from: "PNVL", to: "PUNE" },
  { id: "SEG-13", from: "THANE", to: "VASAI" },
];

export interface TrainSeed {
  id: string;
  name: string;
  route: string[];
  leg: number;
  progress: number;
  speedKmh: number;
  passengers: number;
  capacity: number;
}

export const TRAIN_SEEDS: TrainSeed[] = [
  {
    id: "TR-2041",
    name: "Deccan Express",
    route: ["CSMT", "DADAR", "THANE", "KALYAN", "LONAVALA", "PUNE"],
    leg: 3,
    progress: 0.7,
    speedKmh: 95,
    passengers: 642,
    capacity: 800,
  },
  {
    id: "TR-1892",
    name: "Mumbai–Surat Fast",
    route: ["CSMT", "DADAR", "VASAI", "SURAT"],
    leg: 1,
    progress: 0.8,
    speedKmh: 100,
    passengers: 510,
    capacity: 720,
  },
  {
    id: "TR-3304",
    name: "Intercity",
    route: ["NASIK", "IGATPURI", "KALYAN", "LONAVALA", "PUNE"],
    leg: 0,
    progress: 0.7,
    speedKmh: 85,
    passengers: 430,
    capacity: 650,
  },
  {
    id: "TR-0751",
    name: "Thane Local",
    route: ["THANE", "KALYAN"],
    leg: 0,
    progress: 0.3,
    speedKmh: 60,
    passengers: 880,
    capacity: 1200,
  },
  {
    id: "TR-4417",
    name: "Rajdhani",
    route: ["BARODA", "SURAT", "VASAI", "DADAR", "CSMT"],
    leg: 0,
    progress: 0.9,
    speedKmh: 110,
    passengers: 720,
    capacity: 900,
  },
  {
    id: "TR-5521",
    name: "Freight 5521",
    route: ["PUNE", "LONAVALA", "KALYAN", "IGATPURI", "NASIK"],
    leg: 0,
    progress: 0.4,
    speedKmh: 55,
    passengers: 0,
    capacity: 0,
  },
  {
    id: "TR-6612",
    name: "Kalyan–Pune Express",
    route: ["KALYAN", "LONAVALA", "PUNE"],
    leg: 0,
    progress: 0.2,
    speedKmh: 90,
    passengers: 530,
    capacity: 750,
  },
  {
    id: "TR-7789",
    name: "Local Shuttle",
    route: ["DADAR", "THANE", "KALYAN"],
    leg: 0,
    progress: 0.5,
    speedKmh: 65,
    passengers: 940,
    capacity: 1100,
  },
];
