import React from "react";
import { renderHook, act, waitFor } from "@testing-library/react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

jest.mock("react-native", () => ({
  useColorScheme: jest.fn(),
}));

import { useColorScheme } from "react-native";
import { ThemeProvider, useCustomTheme } from "../../contexts/ThemeContext";

describe("ThemeContext", () => {
  const wrapper = ({ children }) => <ThemeProvider>{children}</ThemeProvider>;

  beforeEach(() => {
    jest.clearAllMocks();
    useColorScheme.mockReturnValue("light");
    AsyncStorage.getItem.mockResolvedValue(null);
    AsyncStorage.setItem.mockResolvedValue(undefined);
  });

  it("loads saved theme from storage", async () => {
    AsyncStorage.getItem.mockResolvedValue("dark");

    const { result } = renderHook(() => useCustomTheme(), { wrapper });

    await waitFor(() => {
      expect(result.current.theme).toBe("dark");
    });
  });

  it("falls back to system theme when no saved value exists", async () => {
    useColorScheme.mockReturnValue("dark");
    AsyncStorage.getItem.mockResolvedValue(null);

    const { result } = renderHook(() => useCustomTheme(), { wrapper });

    await waitFor(() => {
      expect(result.current.theme).toBe("dark");
    });
  });

  it("toggles theme and persists updated value", async () => {
    const { result } = renderHook(() => useCustomTheme(), { wrapper });

    await waitFor(() => {
      expect(result.current.theme).toBe("light");
    });

    await act(async () => {
      result.current.toggleTheme();
    });

    await waitFor(() => {
      expect(result.current.theme).toBe("dark");
    });

    expect(AsyncStorage.setItem).toHaveBeenCalledWith("@app_theme", "dark");
  });
});
