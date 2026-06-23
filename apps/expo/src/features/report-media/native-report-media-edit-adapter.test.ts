import { describe, expect, it, vi } from "vitest";

import { createNativeReportMediaEditAdapter } from "./native-report-media-edit-adapter";

vi.mock("expo-file-system/legacy", () => ({
  getInfoAsync: vi.fn(),
}));

vi.mock("expo-image-manipulator", () => ({
  manipulateAsync: vi.fn(),
}));

describe("native report media edit adapter", () => {
  it("does not load native modules while creating the adapter", () => {
    expect(() =>
      createNativeReportMediaEditAdapter({
        loadFileSystem: () => {
          throw new Error("File system native module unavailable");
        },
        loadImageManipulator: () => {
          throw new Error("Image manipulator native module unavailable");
        },
      }),
    ).not.toThrow();
  });

  it("applies crop and rotation and returns accepted edited image metadata with local file size", async () => {
    const manipulateAsync = vi.fn(() =>
      Promise.resolve({
        height: 900,
        uri: "file:///edited/local-photo-1.webp",
        width: 1200,
      }),
    );
    const adapter = createNativeReportMediaEditAdapter({
      fileSystem: {
        getInfoAsync: vi.fn(() =>
          Promise.resolve({
            exists: true,
            isDirectory: false,
            size: 280_000,
            uri: "file:///edited/local-photo-1.webp",
          }),
        ),
      },
      imageManipulator: {
        manipulateAsync,
      },
    });

    await expect(
      adapter.editImage({
        crop: {
          height: 900,
          originX: 100,
          originY: 25,
          width: 1200,
        },
        export: {
          compress: 0.82,
          mimeType: "image/webp",
        },
        localId: "local-photo-1",
        rotateDegrees: 90,
        sourceUri: "file:///camera/original.jpg",
      }),
    ).resolves.toEqual({
      height: 900,
      localId: "local-photo-1",
      mimeType: "image/webp",
      sizeBytes: 280_000,
      uri: "file:///edited/local-photo-1.webp",
      width: 1200,
    });

    expect(manipulateAsync).toHaveBeenCalledWith(
      "file:///camera/original.jpg",
      [
        {
          crop: {
            height: 900,
            originX: 100,
            originY: 25,
            width: 1200,
          },
        },
        {
          rotate: 90,
        },
      ],
      {
        base64: false,
        compress: 0.82,
        format: "webp",
      },
    );
  });
});
