import React from "react";
import { renderHook, act, waitFor } from "@testing-library/react-native";

let mockAuthListener;
const mockUnsubscribe = jest.fn();

const mockAuth = {
  currentUser: null,
  onAuthStateChanged: jest.fn((cb) => {
    mockAuthListener = cb;
    return mockUnsubscribe;
  }),
};

jest.mock("../../../firebaseConfig", () => ({
  auth: {
    currentUser: null,
    onAuthStateChanged: jest.fn(() => jest.fn()),
  },
}));

jest.mock("../../utils/storage", () => ({
  getFavorites: jest.fn(),
  saveFavorite: jest.fn(),
  removeFavorite: jest.fn(),
}));

import {
  FavoritesProvider,
  useFavorites,
} from "../../contexts/FavoritesContext";
import {
  getFavorites as apiGetFavorites,
  saveFavorite as apiSaveFavorite,
} from "../../utils/storage";

describe("FavoritesContext", () => {
  const wrapper = ({ children }) => (
    <FavoritesProvider authClient={mockAuth}>{children}</FavoritesProvider>
  );

  const waitForAuthListenerRegistration = async () => {
    await waitFor(() => {
      expect(mockAuth.onAuthStateChanged).toHaveBeenCalled();
      expect(typeof mockAuthListener).toBe("function");
    });
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockAuthListener = undefined;
    mockAuth.currentUser = null;
    apiGetFavorites.mockResolvedValue([]);
    apiSaveFavorite.mockResolvedValue(undefined);
  });

  it("loads favorites on auth login", async () => {
    const favorite = { imdbID: "tt001", Title: "A Movie" };
    apiGetFavorites.mockResolvedValue([favorite]);

    const { result } = renderHook(() => useFavorites(), { wrapper });

    await waitForAuthListenerRegistration();

    mockAuth.currentUser = { uid: "u1" };
    act(() => {
      mockAuthListener(mockAuth.currentUser);
    });

    await waitFor(() => {
      expect(result.current.initialized).toBe(true);
      expect(result.current.loading).toBe(false);
      expect(result.current.favorites).toEqual([favorite]);
    });

    expect(apiGetFavorites).toHaveBeenCalledTimes(1);
  });

  it("clears favorites on logout event", async () => {
    const favorite = { imdbID: "tt002", Title: "B Movie" };
    apiGetFavorites.mockResolvedValue([favorite]);

    const { result } = renderHook(() => useFavorites(), { wrapper });

    await waitForAuthListenerRegistration();

    mockAuth.currentUser = { uid: "u1" };
    act(() => {
      mockAuthListener(mockAuth.currentUser);
    });

    await waitFor(() => {
      expect(result.current.favorites).toEqual([favorite]);
    });

    mockAuth.currentUser = null;
    act(() => {
      mockAuthListener(null);
    });

    await waitFor(() => {
      expect(result.current.favorites).toEqual([]);
      expect(result.current.loading).toBe(false);
      expect(result.current.initialized).toBe(true);
    });
  });

  it("applies optimistic add and persists it", async () => {
    const { result } = renderHook(() => useFavorites(), { wrapper });

    await waitForAuthListenerRegistration();

    act(() => {
      mockAuthListener(null);
    });

    const favorite = { imdbID: "tt003", Title: "C Movie" };
    await act(async () => {
      await result.current.addToFavorites(favorite);
    });

    expect(result.current.favorites).toContainEqual(favorite);
    expect(apiSaveFavorite).toHaveBeenCalledWith(favorite);
  });

  it("unsubscribes auth listener on unmount", () => {
    const { unmount } = renderHook(() => useFavorites(), { wrapper });

    expect(mockAuth.onAuthStateChanged).toHaveBeenCalled();

    unmount();

    expect(mockUnsubscribe).toHaveBeenCalledTimes(1);
  });
});
