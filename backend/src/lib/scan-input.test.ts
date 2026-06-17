import assert from "node:assert/strict";
import test from "node:test";
import { parseScanImages, parseScanInput } from "./scan-input.js";

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

test("parses optional client id and image sources", () => {
  assert.deepEqual(
    parseScanInput({
      imageBase64List: [validImage, validImage, validImage],
      clientId: "client-123456",
      imageSources: ["camera", "library", "garbage"],
    }),
    {
      imageBase64List: [validImage, validImage, validImage],
      clientId: "client-123456",
      imageSources: ["camera", "library", "unknown"],
    },
  );
});

test("defaults missing metadata safely", () => {
  assert.deepEqual(parseScanInput({ imageBase64: validImage }), {
    imageBase64List: [validImage],
    clientId: null,
    imageSources: ["unknown"],
  });
});
