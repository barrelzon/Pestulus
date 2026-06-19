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

const blackAntCandidates: Candidate[] = [
  {
    id: "svart-jordmaur",
    navnNo: "Svart jordmaur",
    navnLatin: "Lasius niger",
    kategori: "Maur",
  },
  {
    id: "sauemaur",
    navnNo: "Sauemaur",
    navnLatin: "Formica fusca",
    kategori: "Maur",
  },
  {
    id: "svart-tremaur",
    navnNo: "Svart tremaur",
    navnLatin: "Lasius fuliginosus",
    kategori: "Maur",
  },
];

test("returns uncertain black ant trio instead of stokkmaur for all-black ants", () => {
  const audit: AntVisualAudit = { colorPattern: "helsvart", redBrownVisible: false };

  const guarded = applyAntVisualGuard(stokkmaurTop, audit, blackAntCandidates);

  assert.equal(guarded.status, "usikker");
  assert.deepEqual(
    guarded.treff.map((treff) => treff.id),
    ["svart-jordmaur", "sauemaur", "svart-tremaur"],
  );
  assert.deepEqual(
    guarded.treff.map((treff) => treff.konfidens),
    [0.6, 0.2, 0.2],
  );
});

test("demotes stokkmaur when visual audit says ants are all black", () => {
  const audit: AntVisualAudit = { colorPattern: "helsvart", redBrownVisible: false };

  const guarded = applyAntVisualGuard(stokkmaurTop, audit);

  assert.equal(guarded.status, "usikker");
  assert.deepEqual(
    guarded.treff.map((treff) => treff.id),
    ["svart-jordmaur", "sauemaur"],
  );
});

test("demotes stokkmaur when visual audit is unclear", () => {
  const audit: AntVisualAudit = { colorPattern: "uklar", redBrownVisible: false };

  const guarded = applyAntVisualGuard(stokkmaurTop, audit);

  assert.equal(guarded.status, "usikker");
  assert.equal(guarded.treff[0]?.id, "svart-jordmaur");
  assert.ok(!guarded.treff.some((treff) => treff.id === "stokkmaur"));
});

test("demotes stokkmaur when visual audit fails", () => {
  const guarded = applyAntVisualGuard(stokkmaurTop, null);

  assert.equal(guarded.status, "usikker");
  assert.equal(guarded.treff[0]?.id, "svart-jordmaur");
  assert.ok(!guarded.treff.some((treff) => treff.id === "stokkmaur"));
});

test("keeps stokkmaur when red-brown coloring is visible", () => {
  const stokkmaurWithNonBlackAlternatives: VisionResult = {
    status: "treff",
    treff: [
      stokkmaurTop.treff[0]!,
      {
        id: "rod-skogsmaur",
        navnNo: "Rød skogsmaur",
        navnLatin: "Formica rufa",
        kategori: "Maur",
        konfidens: 0.04,
      },
      {
        id: "brun-tremaur",
        navnNo: "Brun tremaur",
        navnLatin: "Lasius brunneus",
        kategori: "Maur",
        konfidens: 0.02,
      },
    ],
  };
  const audit: AntVisualAudit = {
    colorPattern: "tofarget_rodbrun_sort",
    redBrownVisible: true,
  };

  const guarded = applyAntVisualGuard(stokkmaurWithNonBlackAlternatives, audit);

  assert.deepEqual(guarded, stokkmaurWithNonBlackAlternatives);
});

test("demotes stokkmaur when black ant alternatives are present even if audit is too optimistic", () => {
  const audit: AntVisualAudit = {
    colorPattern: "tofarget_rodbrun_sort",
    redBrownVisible: true,
  };

  const guarded = applyAntVisualGuard(stokkmaurTop, audit);

  assert.equal(guarded.status, "usikker");
  assert.equal(guarded.treff[0]?.id, "svart-jordmaur");
  assert.equal(guarded.treff[1]?.id, "sauemaur");
  assert.ok(!guarded.treff.some((treff) => treff.id === "stokkmaur"));
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
