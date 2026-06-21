import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PrefsProvider, usePrefs } from "./PrefsContext";

function Probe() {
  const { prefs, setTheme } = usePrefs();
  return <button onClick={() => setTheme(prefs.theme === "dark" ? "light" : "dark")}>{prefs.theme}</button>;
}

test("toggles theme and reflects on <html>", async () => {
  render(<PrefsProvider><Probe /></PrefsProvider>);
  expect(screen.getByText("dark")).toBeInTheDocument();
  await userEvent.click(screen.getByRole("button"));
  expect(document.documentElement.getAttribute("data-theme")).toBe("light");
});
