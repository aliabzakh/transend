/**
 * The simulated shop network for the operations view (/ops) and for training.
 * The three real demo shops live in the database (lib/server/demo.ts); every shop
 * here is SIMULATED: a real Haitian town, a made-up shop, synthetic payouts.
 * Each one is marked `simulated: true` and the dashboard labels it so.
 * Coordinates are town centres.
 *
 * There are no cash depots or deliveries: each shopkeeper tops up her own payout cash
 * from her sales or her MonCash or Fonkoze account, and is paid back digitally.
 */
export type AreaStatus = "calm" | "tense" | "closed";

export type NetworkCommune = {
  id: string;
  name: string;
  department: string;
  lat: number;
  lng: number;
  status: AreaStatus;
};

export type NetworkShop = {
  id: string;
  name: string;
  communeId: string;
  lat: number;
  lng: number;
  hardCapCad: number;
  simulated: boolean;
};

export const SIM_COMMUNES: NetworkCommune[] = [
  { id: "sim-portdepaix", name: "Port-de-Paix", department: "Nord-Ouest", lat: 19.9396, lng: -72.8302, status: "calm" },
  { id: "sim-jeanrabel", name: "Jean-Rabel", department: "Nord-Ouest", lat: 19.853, lng: -73.191, status: "calm" },
  { id: "sim-stlouis", name: "Saint-Louis-du-Nord", department: "Nord-Ouest", lat: 19.933, lng: -72.722, status: "calm" },
  { id: "sim-bombardopolis", name: "Bombardopolis", department: "Nord-Ouest", lat: 19.692, lng: -73.339, status: "calm" },
  { id: "sim-cap", name: "Cap-Haïtien", department: "Nord", lat: 19.7578, lng: -72.2042, status: "calm" },
  { id: "sim-limbe", name: "Limbé", department: "Nord", lat: 19.705, lng: -72.4, status: "calm" },
  { id: "sim-plaisance", name: "Plaisance", department: "Nord", lat: 19.598, lng: -72.468, status: "calm" },
  { id: "sim-fortliberte", name: "Fort-Liberté", department: "Nord-Est", lat: 19.663, lng: -71.838, status: "calm" },
  { id: "sim-gonaives", name: "Gonaïves", department: "Artibonite", lat: 19.4469, lng: -72.689, status: "calm" },
  { id: "sim-ennery", name: "Ennery", department: "Artibonite", lat: 19.483, lng: -72.483, status: "calm" },
  { id: "sim-stmarc", name: "Saint-Marc", department: "Artibonite", lat: 19.108, lng: -72.694, status: "tense" },
  { id: "sim-hinche", name: "Hinche", department: "Centre", lat: 19.145, lng: -72.005, status: "calm" },
  { id: "sim-mirebalais", name: "Mirebalais", department: "Centre", lat: 18.834, lng: -72.105, status: "tense" },
  { id: "sim-cayes", name: "Les Cayes", department: "Sud", lat: 18.194, lng: -73.75, status: "calm" },
  { id: "sim-aquin", name: "Aquin", department: "Sud", lat: 18.28, lng: -73.398, status: "calm" },
  { id: "sim-jeremie", name: "Jérémie", department: "Grand'Anse", lat: 18.65, lng: -74.117, status: "calm" },
  { id: "sim-miragoane", name: "Miragoâne", department: "Nippes", lat: 18.442, lng: -73.088, status: "calm" },
  { id: "sim-jacmel", name: "Jacmel", department: "Sud-Est", lat: 18.234, lng: -72.535, status: "calm" },
  { id: "sim-bainet", name: "Bainet", department: "Sud-Est", lat: 18.179, lng: -72.749, status: "calm" },
];

// [id, name, commune, metres north, metres east] from the commune centre.
const SHOP_ROWS: [string, string, string, number, number][] = [
  ["X-301", "Boutik Jean-Louis", "sim-portdepaix", 350, -500],
  ["X-302", "Boutik Celestin", "sim-portdepaix", -400, 450],
  ["X-311", "Boutik Altidor", "sim-jeanrabel", 120, 200],
  ["X-321", "Boutik Exantus", "sim-stlouis", -150, -250],
  ["X-331", "Boutik Dorélien", "sim-bombardopolis", 100, 150],
  ["X-401", "Boutik Toussaint", "sim-cap", 600, -300],
  ["X-402", "Boutik Saint-Fleur", "sim-cap", -500, 700],
  ["X-411", "Boutik Fleurant", "sim-limbe", 200, -150],
  ["X-421", "Boutik Augustin", "sim-plaisance", -120, 180],
  ["X-431", "Boutik Valcourt", "sim-fortliberte", 150, -200],
  ["X-501", "Boutik Charles", "sim-gonaives", 450, 300],
  ["X-502", "Boutik Desir", "sim-gonaives", -350, -600],
  ["X-511", "Boutik Noel", "sim-ennery", 100, -100],
  ["X-521", "Boutik Bastien", "sim-stmarc", 300, 150],
  ["X-601", "Boutik Etienne", "sim-hinche", -200, 250],
  ["X-611", "Boutik Lafortune", "sim-mirebalais", 180, -120],
  ["X-701", "Boutik Joseph", "sim-cayes", 400, -350],
  ["X-702", "Boutik Michel", "sim-cayes", -300, 500],
  ["X-711", "Boutik Dorvil", "sim-aquin", 150, 120],
  ["X-721", "Boutik Petit-Frère", "sim-jeremie", -100, 300],
  ["X-731", "Boutik Florestal", "sim-miragoane", 200, -180],
  ["X-801", "Boutik Pierre", "sim-jacmel", 250, 350],
  ["X-811", "Boutik Jean-Baptiste", "sim-bainet", -150, -100],
];

const M_PER_DEG = 111_320;

export const SIM_SHOPS: NetworkShop[] = SHOP_ROWS.map(([id, name, communeId, north, east]) => {
  const c = SIM_COMMUNES.find((x) => x.id === communeId)!;
  return {
    id,
    name,
    communeId,
    lat: +(c.lat + north / M_PER_DEG).toFixed(5),
    lng: +(c.lng + east / (M_PER_DEG * Math.cos((c.lat * Math.PI) / 180))).toFixed(5),
    hardCapCad: 1000,
    simulated: true,
  };
});

/** Every shop id the forecast trains on: the three real demo shops plus the simulated network. */
export const TRAINING_SHOP_IDS = ["S-101", "S-102", "S-201", ...SIM_SHOPS.map((s) => s.id)];
