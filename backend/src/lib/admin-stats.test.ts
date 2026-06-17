import assert from "node:assert/strict";
import test from "node:test";
import { buildAdminStats } from "./admin-stats.js";
import type { FeedbackLogEntry, ScanLogEntry } from "./activity-log.js";

const scans: ScanLogEntry[] = [
  {
    scanId: "scan-1",
    clientId: "client-a",
    tidspunkt: "2026-06-17T20:00:00.000Z",
    status: "treff",
    imageCount: 2,
    imageSource: "mixed",
    imageSources: ["camera", "library"],
    images: [
      { fileName: "scan-1-1.jpg", urlPath: "/admin/images/scan-1-1.jpg", source: "camera" },
      { fileName: "scan-1-2.jpg", urlPath: "/admin/images/scan-1-2.jpg", source: "library" },
    ],
    treff: [
      {
        navnNo: "Veggedyr",
        navnLatin: "Cimex lectularius",
        kategori: "Veggedyr og andre teger",
        konfidens: 0.91,
      },
      {
        navnNo: "Brunrotte",
        navnLatin: "Rattus norvegicus",
        kategori: "Gnagere",
        konfidens: 0.22,
      },
    ],
    topTreff: {
      navnNo: "Veggedyr",
      navnLatin: "Cimex lectularius",
      kategori: "Veggedyr og andre teger",
      konfidens: 0.91,
    },
  },
  {
    tidspunkt: "2026-06-17T20:01:00.000Z",
    status: "usikker",
    imageCount: 1,
    topTreff: {
      navnNo: "Brunrotte",
      navnLatin: "Rattus norvegicus",
      kategori: "Gnagere",
      konfidens: 0.52,
    },
  },
  {
    tidspunkt: "2026-06-17T20:02:00.000Z",
    status: "ikke_skadedyr",
    imageCount: 1,
    topTreff: null,
  },
];

const feedback: FeedbackLogEntry[] = [
  {
    scanId: "scan-1",
    tidspunkt: "2026-06-17T20:03:00.000Z",
    vote: "like",
    treff: {
      navnNo: "Veggedyr",
      navnLatin: "Cimex lectularius",
      kategori: "Veggedyr og andre teger",
    },
    korrigertArtId: null,
  },
  {
    scanId: "scan-2",
    tidspunkt: "2026-06-17T20:04:00.000Z",
    vote: "dislike",
    treff: {
      navnNo: "Brunrotte",
      navnLatin: "Rattus norvegicus",
      kategori: "Gnagere",
    },
    korrigertArtId: "svartrotte",
  },
  {
    scanId: null,
    tidspunkt: "2026-06-17T20:05:00.000Z",
    vote: "dislike",
    treff: {
      navnNo: "Brunrotte",
      navnLatin: "Rattus norvegicus",
      kategori: "Gnagere",
    },
    korrigertArtId: null,
  },
];

test("aggregates scan and feedback totals", () => {
  const stats = buildAdminStats(scans, feedback, [{ id: "svartrotte", navnNo: "Svartrotte" }]);

  assert.equal(stats.totals.scans, 3);
  assert.equal(stats.totals.feedback, 3);
  assert.equal(stats.scanStatus.treff, 1);
  assert.equal(stats.scanStatus.usikker, 1);
  assert.equal(stats.scanStatus.ikke_skadedyr, 1);
  assert.equal(stats.feedbackVotes.like, 1);
  assert.equal(stats.feedbackVotes.dislike, 2);
  assert.deepEqual(stats.mostDisliked[0], {
    navnNo: "Brunrotte",
    kategori: "Gnagere",
    count: 2,
  });
  assert.equal(stats.recentScans[2]?.scanId, "scan-1");
  assert.equal(stats.recentScans[2]?.clientId, "client-a");
  assert.equal(stats.recentScans[2]?.images?.length, 2);
  assert.equal(stats.recentScans[2]?.treff?.[1]?.navnNo, "Brunrotte");
  assert.equal(stats.recentFeedback[2]?.scanId, "scan-1");
  assert.equal(stats.recentFeedback[0]?.correctedSpeciesName, null);
  assert.equal(stats.recentFeedback[1]?.correctedSpeciesName, "Svartrotte");
});
