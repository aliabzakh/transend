/**
 * Prints the sample card through the real print code (web/lib/cards/pdf.ts), so the Devpost
 * images show exactly what a sender downloads. The ID is the demo card's; the codes are the
 * designers' sample codes from docs/brand/cards/transend_card_back.svg, not the demo card's real ones.
 *
 * usage (from web/): npx tsx ../docs/image-picks/source/devpost-v2/card.ts <out.pdf>
 */
import { writeFileSync } from "node:fs";
import { cardsPdf } from "../../../../web/lib/cards/pdf";

const codes = [
  "90RW3TK7M2HV", "4F7K2M9QX8D1", "7QHN5P3RT2WK", "2M8VX4KD9R6N", "6K3QW9MT2P7H",
  "T9N4R7KX3M2V", "8P2HK5QW4R9M", "3R7MX2KT9P4N", "5Q9WK3MT7R2P", "N4P7RX2KM9T3",
  "2T8MK4QW9R7P", "9R3KX7MT2P4N", "4M7QW2KT9R3P", "7P2RK9MX4T3N", "3K9WT2MR7P4Q",
  "M2P7RX9KT4N3", "8Q4WK2MT7R9P", "2R9KX4MT3P7N", "5M7QW9KT2R4P", "P3K2RX7MT9N4",
];

const pdf = await cardsPdf([{ cardId: "TS4F2K9Q", codes, renewalCode: "RN8K2M4QW7PX" }], "a6");
writeFileSync(process.argv[2], pdf);
console.log("wrote", process.argv[2], pdf.length, "bytes");
