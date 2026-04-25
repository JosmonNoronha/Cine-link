describe("frontend logger service", () => {
  let logger;

  beforeEach(() => {
    jest.resetModules();
    logger = require("../../services/logger").default;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test("writes structured info payload", () => {
    const logSpy = jest.spyOn(console, "log").mockImplementation(() => {});

    logger.info("API ready", { baseUrl: "https://example.com" });

    expect(logSpy).toHaveBeenCalledTimes(1);
    expect(logSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        level: "info",
        message: "API ready",
        meta: { baseUrl: "https://example.com" },
      }),
    );
  });

  test("normalizes Error metadata", () => {
    const errorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    const err = new Error("boom");

    logger.error("request failed", err);

    expect(errorSpy).toHaveBeenCalledTimes(1);
    expect(errorSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        level: "error",
        message: "request failed",
        meta: expect.objectContaining({ message: "boom", name: "Error" }),
      }),
    );
  });

  test("supports multiple metadata arguments", () => {
    const warnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});

    logger.warn("request warning", "timeout", { attempt: 2 });

    expect(warnSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        level: "warn",
        message: "request warning",
        meta: ["timeout", { attempt: 2 }],
      }),
    );
  });
});
