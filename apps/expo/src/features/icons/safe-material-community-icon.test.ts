import type * as ReactType from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const reactMock = vi.hoisted(() => ({
  effects: [] as (() => void | (() => void))[],
  setState: vi.fn(),
}));

const vectorIconMock = vi.hoisted(() => ({
  loadFont: vi.fn(),
  MaterialCommunityIcons: Object.assign(
    function MaterialCommunityIcons() {
      return null;
    },
    { loadFont: vi.fn() },
  ),
}));

vi.mock("react", async () => {
  const actual = await vi.importActual<typeof ReactType>("react");

  return {
    ...actual,
    useEffect: (effect: () => void | (() => void)) => {
      reactMock.effects.push(effect);
    },
    useState: <TValue,>(initialValue: TValue | (() => TValue)) => [
      typeof initialValue === "function"
        ? (initialValue as () => TValue)()
        : initialValue,
      reactMock.setState,
    ],
  };
});

vi.mock("react-native", () => ({
  StyleSheet: {
    create: <TStyles extends Record<string, unknown>>(styles: TStyles) =>
      styles,
  },
  Text: "Text",
}));

vi.mock("@expo/vector-icons", () => ({
  MaterialCommunityIcons: vectorIconMock.MaterialCommunityIcons,
}));

describe("SafeMaterialCommunityIcon", () => {
  beforeEach(() => {
    vi.resetModules();
    reactMock.effects = [];
    reactMock.setState.mockReset();
    vectorIconMock.MaterialCommunityIcons.loadFont.mockReset();
  });

  it("rerenders fallback icons when the Material Community font becomes available", async () => {
    let resolveFont!: () => void;
    vectorIconMock.MaterialCommunityIcons.loadFont.mockReturnValue(
      new Promise<void>((resolve) => {
        resolveFont = resolve;
      }),
    );

    const { SafeMaterialCommunityIcon } = await import(
      "./safe-material-community-icon"
    );

    const fallbackIcon = SafeMaterialCommunityIcon({
      color: "#115e59",
      name: "paw",
      size: 20,
    });

    expect(
      typeof fallbackIcon.type === "function" && fallbackIcon.type.name,
    ).toBe("TextIcon");
    expect(
      vectorIconMock.MaterialCommunityIcons.loadFont,
    ).not.toHaveBeenCalled();

    for (const runEffect of reactMock.effects) {
      runEffect();
    }

    expect(vectorIconMock.MaterialCommunityIcons.loadFont).toHaveBeenCalledTimes(
      1,
    );
    expect(reactMock.setState).toHaveBeenCalledWith("loading");

    resolveFont();
    await Promise.resolve();
    await Promise.resolve();

    expect(reactMock.setState).toHaveBeenCalledWith("loaded");

    const vectorIcon = SafeMaterialCommunityIcon({
      color: "#115e59",
      name: "paw",
      size: 20,
    });

    expect(vectorIcon.type).toBe(vectorIconMock.MaterialCommunityIcons);
    expect((vectorIcon.props as { name: string }).name).toBe("paw");
  });
});
