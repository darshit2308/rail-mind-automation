import L from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  CircleMarker,
  MapContainer,
  Marker,
  Polyline,
  Popup,
  TileLayer,
  Tooltip,
} from "react-leaflet";
import { STATIONS } from "@/data/network";
import type { Incident, Segment, Severity, Train } from "@/lib/sim/types";

const SEG_COLOR: Record<Segment["status"], string> = {
  clear:      "#3B82F6",
  restricted: "#F59E0B",
  closed:     "#F43F5E",
};

const SEG_COLOR_NETWORK: Record<Segment["status"], string> = {
  clear:      "#16A34A",
  restricted: "#D97706",
  closed:     "#DC2626",
};

const TRAIN_COLOR: Record<Train["status"], string> = {
  on_time:  "#16A34A",
  delayed:  "#D97706",
  halted:   "#DC2626",
  rerouted: "#7E22CE",
};

const TRAIN_BG: Record<Train["status"], string> = {
  on_time:  "rgba(34, 197, 94, 0.15)",
  delayed:  "rgba(217, 119, 6, 0.15)",
  halted:   "rgba(220, 38, 38, 0.15)",
  rerouted: "rgba(126, 34, 206, 0.15)",
};

const SEV_COLOR: Record<Severity, string> = {
  medium:   "#D97706",
  high:     "#EA580C",
  critical: "#DC2626",
};

const MAJOR_STATIONS = ["CSMT", "DADAR", "THANE", "KALYAN", "PUNE", "SURAT"];
const stationMap = new Map(STATIONS.map((s) => [s.id, s] as const));

function trainIcon(t: Train) {
  const c = TRAIN_COLOR[t.status];
  const bg = TRAIN_BG[t.status];
  const blink = t.status === "halted"
    ? `animation: pulse 1.4s ease-in-out infinite;`
    : "";
  return L.divIcon({
    className: "",
    html: `
      <div style="
        display:flex;align-items:center;gap:4px;
        background:${bg};
        border:1.5px solid ${c};
        border-radius:20px;
        padding:3px 7px 3px 5px;
        box-shadow:0 1px 4px rgba(0,0,0,0.50);
        backdrop-filter:blur(4px);
        ${blink}
      ">
        <span style="width:7px;height:7px;border-radius:50%;background:${c};display:block;"></span>
        <span style="font-family:JetBrains Mono,monospace;font-size:10px;font-weight:700;color:${c};letter-spacing:0.04em;">
          ${t.id}
        </span>
      </div>`,
    iconSize: [52, 22],
    iconAnchor: [26, 11],
  });
}

function incidentIcon(i: Incident) {
  const c = SEV_COLOR[i.severity];
  return L.divIcon({
    className: "",
    html: `
      <div style="position:relative;width:22px;height:22px;display:flex;align-items:center;justify-content:center;">
        <div style="
          position:absolute;width:22px;height:22px;border-radius:50%;
          background:${c}20;border:1.5px solid ${c}60;
          animation:pulse 1.6s ease-in-out infinite;
        "></div>
        <div style="
          width:11px;height:11px;border-radius:50%;
          background:${c};
          box-shadow:0 0 0 3px ${c}30;
        "></div>
      </div>`,
    iconSize: [22, 22],
    iconAnchor: [11, 11],
  });
}

function occupancyFor(stId: string, trains: Train[]) {
  const st = stationMap.get(stId)!;
  const pax = trains
    .filter((t) => Math.abs(t.lat - st.lat) + Math.abs(t.lng - st.lng) < 0.4)
    .reduce((s, t) => s + t.passengers, 0);
  return Math.min(0.97, 0.3 + pax / 2800);
}

interface RailMapProps {
  trains: Train[];
  segments: Segment[];
  incidents: Incident[];
  networkView?: boolean;
}

export default function RailMap({ trains, segments, incidents, networkView }: RailMapProps) {
  const segColors = networkView ? SEG_COLOR_NETWORK : SEG_COLOR;

  return (
    <MapContainer
      center={[20.1, 73.15]}
      zoom={8}
      className="h-full w-full"
      zoomControl={true}
      scrollWheelZoom={true}
    >
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; CARTO'
      />

      {segments.map((s) => {
        const a = stationMap.get(s.from)!;
        const b = stationMap.get(s.to)!;
        return (
          <Polyline
            key={s.id}
            positions={[[a.lat, a.lng], [b.lat, b.lng]]}
            pathOptions={{
              color: segColors[s.status],
              weight: s.status === "clear" ? 3 : 4.5,
              opacity: 0.85,
              dashArray: s.status === "restricted" ? "8 6" : undefined,
              lineCap: "round",
              lineJoin: "round",
            }}
          />
        );
      })}

      {networkView &&
        MAJOR_STATIONS.map((id) => {
          const st = stationMap.get(id)!;
          const occ = occupancyFor(id, trains);
          const occColor = occ > 0.85 ? "#DC2626" : occ > 0.65 ? "#D97706" : "#16A34A";
          return (
            <CircleMarker
              key={`occ-${id}`}
              center={[st.lat, st.lng]}
              radius={10 + occ * 14}
              pathOptions={{
                color: occColor,
                weight: 1.5,
                fillColor: occColor,
                fillOpacity: 0.15,
              }}
            >
              <Tooltip direction="top" offset={[0, -10]}>
                <span style={{ fontSize: 12, fontWeight: 600, fontFamily: "var(--font-mono)", color: "var(--ink-primary)" }}>
                  {st.name} — <span style={{ color: "var(--ink-secondary)", fontWeight: 500 }}>{Math.round(occ * 100)}% occupancy</span>
                </span>
              </Tooltip>
            </CircleMarker>
          );
        })}

      {STATIONS.map((st) => (
        <CircleMarker
          key={st.id}
          center={[st.lat, st.lng]}
          radius={5}
          pathOptions={{
            color: "var(--bg-panel)",
            weight: 1.5,
            fillColor: "var(--ink-muted)",
            fillOpacity: 1,
          }}
        >
          <Tooltip direction="top" offset={[0, -7]}>
            <span style={{ fontSize: 12, fontWeight: 600, fontFamily: "var(--font-ui)", color: "var(--ink-primary)" }}>{st.name}</span>
          </Tooltip>
        </CircleMarker>
      ))}

      {trains.map((t) => {
        const from = stationMap.get(t.route[0])?.name ?? t.route[0];
        const to = stationMap.get(t.route[t.route.length - 1])?.name ?? "";
        const statusColor = TRAIN_COLOR[t.status];
        return (
          <Marker key={t.id} position={[t.lat, t.lng]} icon={trainIcon(t)}>
            <Popup>
              <div style={{ fontFamily: "var(--font-ui)", fontSize: 12, minWidth: 160, color: "var(--ink-primary)" }}>
                <p style={{ fontWeight: 700, margin: "0 0 8px" }}>
                  {t.id} · {t.name}
                </p>
                <p style={{ color: statusColor, fontWeight: 600, margin: "0 0 4px", textTransform: "capitalize" }}>
                  {t.status.replace("_", " ")}
                  {t.delayMinutes > 0 ? ` +${Math.round(t.delayMinutes)} min` : ""}
                </p>
                <p style={{ color: "var(--ink-secondary)", margin: "2px 0" }}>From: {from}</p>
                <p style={{ color: "var(--ink-secondary)", margin: "2px 0" }}>To: {to}</p>
                <p style={{ color: "var(--ink-secondary)", margin: "2px 0" }}>
                  Speed: {t.status === "halted" ? 0 : t.speedKmh} km/h
                </p>
                {t.capacity > 0 && (
                  <p style={{ color: "var(--ink-secondary)", margin: "2px 0" }}>
                    Passengers: {t.passengers}/{t.capacity}
                  </p>
                )}
              </div>
            </Popup>
          </Marker>
        );
      })}

      {incidents
        .filter((i) => i.status !== "resolved")
        .map((i) => (
          <Marker key={i.id} position={[i.lat, i.lng]} icon={incidentIcon(i)} zIndexOffset={1000}>
            <Popup>
              <div style={{ fontFamily: "var(--font-ui)", fontSize: 12, minWidth: 160, color: "var(--ink-primary)" }}>
                <p style={{ fontWeight: 700, margin: "0 0 8px" }}>
                  {i.id} · {i.label}
                </p>
                <p style={{ color: "var(--ink-secondary)", margin: "2px 0" }}>Location: {i.locationName}</p>
                <p style={{ margin: "2px 0" }}>
                  Severity:{" "}
                  <span style={{ color: SEV_COLOR[i.severity], fontWeight: 600, textTransform: "capitalize" }}>
                    {i.severity}
                  </span>
                </p>
                <p style={{ color: "var(--ink-secondary)", margin: "2px 0" }}>
                  Affected: {i.affectedTrains.join(", ") || "—"}
                </p>
                <p style={{ color: "var(--ink-secondary)", margin: "2px 0", textTransform: "capitalize" }}>
                  Status: {i.status.replace("_", " ")}
                </p>
              </div>
            </Popup>
          </Marker>
        ))}
    </MapContainer>
  );
}