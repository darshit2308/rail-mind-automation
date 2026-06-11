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
  clear: "#1E40AF",
  restricted: "#F59E0B",
  closed: "#EF4444",
};

const SEG_COLOR_NETWORK: Record<Segment["status"], string> = {
  clear: "#10B981",
  restricted: "#F59E0B",
  closed: "#EF4444",
};

const TRAIN_COLOR: Record<Train["status"], string> = {
  on_time: "#10B981",
  delayed: "#F59E0B",
  halted: "#EF4444",
  rerouted: "#8B5CF6",
};

const SEV_COLOR: Record<Severity, string> = {
  medium: "#F59E0B",
  high: "#F97316",
  critical: "#EF4444",
};

const MAJOR_STATIONS = ["CSMT", "DADAR", "THANE", "KALYAN", "PUNE", "SURAT"];

const stationMap = new Map(STATIONS.map((s) => [s.id, s] as const));

function trainIcon(t: Train) {
  const c = TRAIN_COLOR[t.status];
  const pulse = t.status === "halted" ? "rm-blink" : "";
  return L.divIcon({
    className: "rm-icon",
    html: `<div class="rm-train"><span class="rm-dot ${pulse}" style="background:${c};box-shadow:0 0 10px ${c}"></span><span class="rm-tid">${t.id}</span></div>`,
    iconSize: [48, 28],
    iconAnchor: [24, 7],
  });
}

function incidentIcon(i: Incident) {
  const c = SEV_COLOR[i.severity];
  return L.divIcon({
    className: "rm-icon",
    html: `<div class="rm-inc" style="--ic:${c}"><span class="rm-inc-ring"></span><span class="rm-inc-core"></span></div>`,
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
            positions={[
              [a.lat, a.lng],
              [b.lat, b.lng],
            ]}
            pathOptions={{
              color: segColors[s.status],
              weight: s.status === "clear" ? 3 : 5,
              opacity: networkView ? 0.95 : 0.8,
              dashArray: s.status === "restricted" ? "6 6" : undefined,
            }}
          />
        );
      })}

      {networkView &&
        MAJOR_STATIONS.map((id) => {
          const st = stationMap.get(id)!;
          const occ = occupancyFor(id, trains);
          const color = occ > 0.85 ? "#EF4444" : occ > 0.65 ? "#F59E0B" : "#10B981";
          return (
            <CircleMarker
              key={`occ-${id}`}
              center={[st.lat, st.lng]}
              radius={10 + occ * 16}
              pathOptions={{ color, weight: 1, fillColor: color, fillOpacity: 0.18 }}
            >
              <Tooltip direction="top" offset={[0, -10]} className="rm-station-label">
                {st.name} — platform occupancy {Math.round(occ * 100)}%
              </Tooltip>
            </CircleMarker>
          );
        })}

      {STATIONS.map((st) => (
        <CircleMarker
          key={st.id}
          center={[st.lat, st.lng]}
          radius={6}
          pathOptions={{ color: "#1E3A8A", weight: 2, fillColor: "#3B82F6", fillOpacity: 1 }}
        >
          <Tooltip direction="top" offset={[0, -7]} className="rm-station-label">
            {st.name}
          </Tooltip>
        </CircleMarker>
      ))}

      {trains.map((t) => {
        const from = stationMap.get(t.route[0])?.name ?? t.route[0];
        const to = stationMap.get(t.route[t.route.length - 1])?.name ?? "";
        return (
          <Marker key={t.id} position={[t.lat, t.lng]} icon={trainIcon(t)}>
            <Popup>
              <div className="space-y-1 font-mono">
                <p className="text-sm font-semibold">
                  {t.id} · {t.name}
                </p>
                <p className="text-[10px] uppercase tracking-wide" style={{ color: TRAIN_COLOR[t.status] }}>
                  {t.status.replace("_", " ")}
                  {t.delayMinutes > 0 ? ` +${Math.round(t.delayMinutes)} min` : ""}
                </p>
                <p>From: {from}</p>
                <p>To: {to}</p>
                <p>Speed: {t.status === "halted" ? 0 : t.speedKmh} km/h</p>
                {t.capacity > 0 && (
                  <p>
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
              <div className="space-y-1 font-mono">
                <p className="text-sm font-semibold">
                  {i.id} · {i.label}
                </p>
                <p>Location: {i.locationName}</p>
                <p>Severity: {i.severity.toUpperCase()}</p>
                <p>Affected: {i.affectedTrains.join(", ") || "—"}</p>
                <p>Status: {i.status.replace("_", " ")}</p>
              </div>
            </Popup>
          </Marker>
        ))}
    </MapContainer>
  );
}
