import assert from "node:assert/strict";
import test from "node:test";

import species from "./species.json" with { type: "json" };

type SpeciesRecord = {
  id: string;
  navnNo: string;
  kjennetegn: string;
  beskrivelse: string;
  forveksling: string;
};

function findSpecies(id: string): SpeciesRecord {
  const record = (species as SpeciesRecord[]).find((item) => item.id === id);
  assert.ok(record, `Fant ikke art med id ${id}`);
  return record;
}

test("stokkmaur describes the common two-colored species without calling all stokkmaur black", () => {
  const stokkmaur = findSpecies("stokkmaur");

  assert.doesNotMatch(stokkmaur.kjennetegn, /5–18 mm, helt svart/i);
  assert.match(stokkmaur.kjennetegn, /tofarget/i);
  assert.match(stokkmaur.kjennetegn, /rødbrun.*sort|sort.*rødbrun/i);
  assert.match(stokkmaur.kjennetegn, /helt svart hode/i);
  assert.match(stokkmaur.beskrivelse, /sotstokkmaur er sjelden/i);
});

test("red skogsmaur comparison does not describe stokkmaur as entirely black", () => {
  const redSkogsmaur = findSpecies("rod-skogsmaur");

  assert.doesNotMatch(redSkogsmaur.forveksling, /Stokkmaur \(helt svart[,.)]/i);
  assert.match(redSkogsmaur.forveksling, /helt svart hode/i);
});
