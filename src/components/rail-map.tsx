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
  clear: "#33415f",
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

const stationMap = new Map(STATIONS.map((s) => [s.id, s] as const));

function trainIcon(t: Train) {
  const c = TRAIN_COLOR[t.status];
  return L.divIcon({
    className: "rm-icon",
    html: `<div class="rm-train"><span class="rm-dot" style="background:${c};box-shadow:0 0 10px ${c}"></span><span class="rm-tid">${t.id}</span></div>`,
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

interface RailMapProps {
  trains: Train[];
  segments: Segment[];
  incidents: Incident[];
}

export default function RailMap({ trains, segments, incidents }: RailMapProps) {
  return (
    <MapContainer
      center={[20.1, 73.15]}
      zoom={8}
      className="h-full w-full"
      zoomControl={false}
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
              color: SEG_COLOR[s.status],
              weight: s.status === "clear" ? 3 : 5,
              opacity: 0.9,
              dashArray: s.status === "restricted" ? "6 6" : undefined,
            }}
          />
        );
      })}

      {STATIONS.map((st) => (
        <CircleMarker
          key={st.id}
          center={[st.lat, st.lng]}
          radius={5}
          pathOptions={{ color: "#3B82F6", weight: 2, fillColor: "#0A0F1E", fillOpacity: 1 }}
        >
          <Tooltip permanent direction="top" offset={[0, -7]} className="rm-station-label">
            {st.name}
          </Tooltip>
        </CircleMarker>
      ))}

      {trains.map((t) => (
        <Marker key={t.id} position={[t.lat, t.lng]} icon={trainIcon(t)}>
          <Popup>
            <div className="space-y-1 font-mono">
              <p className="text-sm font-semibold">
                {t.id} · {t.name}
              </p>
              <p>Status: {t.status.replace("_", " ")}</p>
              <p>Speed: {t.status === "halted" ? 0 : t.speedKmh} km/h</p>
              <p>Delay: {Math.round(t.delayMinutes)} min</p>
              {t.capacity > 0 && (
                <p>
                  Passengers: {t.passengers}/{t.capacity}
                </p>
              )}
            </div>
          </Popup>
        </Marker>
      ))}

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
