import {
  normalizeEmail,
  validateEmail,
  validateUsername,
  validatePasswordSignIn,
  validatePasswordSignUp,
  passwordStrength,
  getFriendlyAuthError,
} from "../utils/authValidation";

describe("authValidation", () => {
  test("normalizeEmail trims and lowercases", () => {
    expect(normalizeEmail("  Foo@Bar.COM ")).toBe("foo@bar.com");
    expect(normalizeEmail(undefined)).toBe("");
  });

  test("validateEmail", () => {
    expect(validateEmail("")).toBe("Enter your email");
    expect(validateEmail("nope")).toBe("Enter a valid email address");
    expect(validateEmail("a@b")).toBe("Enter a valid email address");
    expect(validateEmail(" user@example.com ")).toBeNull();
  });

  test("validateUsername", () => {
    expect(validateUsername("")).toBeTruthy();
    expect(validateUsername("ab")).toBeTruthy();
    expect(validateUsername("a".repeat(21))).toBeTruthy();
    expect(validateUsername("bad name")).toBeTruthy();
    expect(validateUsername("movie_buff.9")).toBeNull();
  });

  test("password rules differ for sign in and sign up", () => {
    expect(validatePasswordSignIn("")).toBeTruthy();
    expect(validatePasswordSignIn("abc")).toBeNull(); // never reject an existing password on strength
    expect(validatePasswordSignUp("short")).toBeTruthy();
    expect(validatePasswordSignUp("longenough")).toBeNull();
  });

  test("passwordStrength", () => {
    expect(passwordStrength("").score).toBe(0);
    expect(passwordStrength("abc").score).toBe(1);
    expect(passwordStrength("abcdefgh").score).toBeLessThan(passwordStrength("Abcdefgh1!xyz").score);
    expect(passwordStrength("Abcdefgh1!xyz")).toEqual({ score: 4, label: "Strong" });
  });

  test("getFriendlyAuthError never leaks raw messages", () => {
    expect(getFriendlyAuthError({ code: "auth/invalid-credential" }).message).toBe("Incorrect email or password.");
    expect(getFriendlyAuthError({ code: "auth/email-already-in-use" }).field).toBe("email");
    expect(getFriendlyAuthError({ code: "auth/network-request-failed" }).message).toMatch(/connection/i);
    const unknown = getFriendlyAuthError({ code: "auth/internal-error", message: "SECRET internal detail" });
    expect(unknown.message).not.toMatch(/SECRET/);
    expect(getFriendlyAuthError(new Error("Firebase not initialized")).message).toMatch(/restart/i);
  });
});