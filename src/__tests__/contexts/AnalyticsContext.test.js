import React from "react";
import { Text } from "react-native";
import { render, waitFor } from "@testing-library/react-native";

jest.mock("../../services/analytics", () => ({
  __esModule: true,
  default: {
    initialize: jest.fn(),
  },
}));

jest.mock("../../services/api", () => ({
  API_BASE_URL: "https://example.com/api",
}));

import analyticsService from "../../services/analytics";
import {
  AnalyticsProvider,
  useAnalytics,
  getActiveRouteName,
} from "../../contexts/AnalyticsContext";

const Probe = () => {
  const service = useAnalytics();
  return <Text testID="analytics-probe">{String(!!service)}</Text>;
};

describe("AnalyticsContext", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("initializes the analytics service when mounted", async () => {
    const { getByTestId } = render(
      <AnalyticsProvider>
        <Probe />
      </AnalyticsProvider>,
    );

    expect(getByTestId("analytics-probe").props.children).toBe("true");

    await waitFor(() => {
      expect(analyticsService.initialize).toHaveBeenCalledWith(
        "https://example.com/api",
      );
    });
  });

  it("returns nested route names from navigation state", () => {
    expect(
      getActiveRouteName({
        index: 0,
        routes: [
          {
            name: "Root",
            state: {
              index: 1,
              routes: [
                { name: "Home" },
                {
                  name: "SearchStack",
                  state: {
                    index: 0,
                    routes: [{ name: "Search" }],
                  },
                },
              ],
            },
          },
        ],
      }),
    ).toBe("Search");
  });
});
