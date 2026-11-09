export type AreaStatus = "calm" | "tense" | "closed";

export const COMMUNES = [
  { id: "mole", name: "Môle-Saint-Nicolas", department: "Nord-Ouest" },
  { id: "anse", name: "Anse-à-Foleur", department: "Nord-Ouest" },
  { id: "bassin", name: "Bassin-Bleu", department: "Nord-Ouest" },
] as const;

export const SHOPS = [
  { id: "S-101", name: "Boutik Marie-Ange", communeId: "mole", ceilingCad: 500 },
  { id: "S-102", name: "Boutik Delva", communeId: "mole", ceilingCad: 500 },
  { id: "S-201", name: "Boutik Louissaint", communeId: "anse", ceilingCad: 500 },
] as const;
