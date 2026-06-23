import { describe, expect, it, vi } from "vitest";

import { createNativeReportMediaUploadTransport } from "./native-report-media-upload-transport";

describe("native report media upload transport", () => {
  it("does not load the native file system while creating the transport", () => {
    expect(() =>
      createNativeReportMediaUploadTransport({
        loadFileSystem: () => {
          throw new Error("File system native module unavailable");
        },
      }),
    ).not.toThrow();
  });

  it("uploads the local file with the backend PUT URL and headers while reporting progress", async () => {
    const uploadAsync = vi.fn(() =>
      Promise.resolve({
        body: "",
        headers: {},
        mimeType: null,
        status: 200,
      }),
    );
    const createUploadTask = vi.fn(
      (
        _url: string,
        _fileUri: string,
        _options: unknown,
        onProgress?: (progress: NativeUploadProgressTestEvent) => void,
      ) => {
        onProgress?.({
          totalBytesExpectedToSend: 300_000,
          totalBytesSent: 75_000,
        });
        onProgress?.({
          totalBytesExpectedToSend: 300_000,
          totalBytesSent: 300_000,
        });

        return { uploadAsync };
      },
    );
    const transport = createNativeReportMediaUploadTransport({
      fileSystem: {
        FileSystemUploadType: {
          BINARY_CONTENT: 0,
        },
        createUploadTask,
      },
    });
    const onProgress = vi.fn();

    await expect(
      transport.putObject({
        localUri: "file:///edited/local-photo-1.webp",
        mimeType: "image/webp",
        onProgress,
        sizeBytes: 300_000,
        upload: {
          headers: {
            "content-type": "image/webp",
            "x-amz-checksum-sha256": "sha256-test",
          },
          method: "PUT",
          url: "https://uploads.example.invalid/report-media/signed",
        },
      }),
    ).resolves.toBeUndefined();

    expect(createUploadTask).toHaveBeenCalledWith(
      "https://uploads.example.invalid/report-media/signed",
      "file:///edited/local-photo-1.webp",
      {
        headers: {
          "content-type": "image/webp",
          "x-amz-checksum-sha256": "sha256-test",
        },
        httpMethod: "PUT",
        uploadType: 0,
      },
      expect.any(Function),
    );
    expect(onProgress).toHaveBeenCalledWith(0.25);
    expect(onProgress).toHaveBeenCalledWith(1);
  });
});

interface NativeUploadProgressTestEvent {
  totalBytesExpectedToSend: number;
  totalBytesSent: number;
}
