import assert from "node:assert/strict";
import test from "node:test";

import {
  applyAntVisualGuard,
  normalizeVisionResult,
  type AntVisualAudit,
  type Candidate,
  type VisionResult,
} from "./vision.js";

const stokkmaurTop: VisionResult = {
  status: "treff",
  treff: [
    {
      id: "stokkmaur",
      navnNo: "Stokkmaur",
      navnLatin: "Camponotus spp.",
      kategori: "Maur",
      konfidens: 0.9,
    },
    {
      id: "sauemaur",
      navnNo: "Sauemaur",
      navnLatin: "Formica fusca",
      kategori: "Maur",
      konfidens: 0.04,
    },
    {
      id: "svart-jordmaur",
      navnNo: "Svart jordmaur",
      navnLatin: "Lasius niger",
      kategori: "Maur",
      konfidens: 0.02,
    },
  ],
};

test("demotes stokkmaur when visual audit says ants are all black", () => {
  const audit: AntVisualAudit = { colorPattern: "helsvart", redBrownVisible: false };

  const guarded = applyAntVisualGuard(stokkmaurTop, audit);

  assert.equal(guarded.status, "usikker");
  assert.equal(guarded.treff[0]?.id, "sauemaur");
  assert.equal(guarded.treff[1]?.id, "svart-jordmaur");
  assert.equal(guarded.treff.at(-1)?.id, "stokkmaur");
  assert.ok((guarded.treff.at(-1)?.konfidens ?? 1) <= 0.25);
});

test("keeps stokkmaur when red-brown coloring is visible", () => {
  const audit: AntVisualAudit = {
    colorPattern: "tofarget_rodbrun_sort",
    redBrownVisible: true,
  };

  const guarded = applyAntVisualGuard(stokkmaurTop, audit);

  assert.deepEqual(guarded, stokkmaurTop);
});

test("normalizes model treff fields from canonical candidate ids", () => {
  const candidates: Candidate[] = [
    {
      id: "sauemaur",
      navnNo: "Sauemaur",
      navnLatin: "Formica fusca",
      kategori: "Maur",
    },
  ];
  const result: VisionResult = {
    status: "treff",
    treff: [
      {
        id: "sauemaur",
        navnNo: "Sauemaur",
        navnLatin: "Formica fusca",
        kategori: "Insekter",
        konfidens: 0.9,
      },
    ],
  };

  const normalized = normalizeVisionResult(result, candidates);

  assert.equal(normalized.treff[0]?.kategori, "Maur");
  assert.equal(normalized.treff[0]?.navnNo, "Sauemaur");
  assert.equal(normalized.treff[0]?.navnLatin, "Formica fusca");
});
