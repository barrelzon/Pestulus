import assert from "node:assert/strict";
import test from "node:test";
import { parseScanImages } from "./scan-input.js";

const validImage = "a".repeat(120);

test("accepts legacy single image body", () => {
  assert.deepEqual(parseScanImages({ imageBase64: validImage }), [validImage]);
});

test("accepts one to three images in imageBase64List", () => {
  assert.deepEqual(parseScanImages({ imageBase64List: [validImage] }), [validImage]);
  assert.deepEqual(parseScanImages({ imageBase64List: [validImage, validImage, validImage] }), [
    validImage,
    validImage,
    validImage,
  ]);
});

test("rejects missing images", () => {
  assert.throws(() => parseScanImages({}), /Mangler gyldig bilde/);
});

test("rejects too many images", () => {
  assert.throws(
    () => parseScanImages({ imageBase64List: [validImage, validImage, validImage, validImage] }),
    /Maks 3 bilder/,
  );
});

test("rejects short or non-string images", () => {
  assert.throws(() => parseScanImages({ imageBase64: "short" }), /Mangler gyldig bilde/);
  assert.throws(() => parseScanImages({ imageBase64List: [validImage, 42] }), /Mangler gyldig bilde/);
});
