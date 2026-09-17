import { describe, expect, it } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { App } from "../../App";
import { FakeEventRepository, sampleEvents } from "../../data/fake_event_repository";
import { ORGANISERS } from "../../data/kai_user";

/**
 * These drive the whole App with a FakeEventRepository injected, so nothing
 * here touches the network.
 *
 * Queries go through roles and accessible names rather than class names, which
 * keeps the tests working through refactors and checks the accessible names
 * exist at the same time.
 */
function renderApp(repository: FakeEventRepository) {
  return render(<App repository={repository} />);
}

describe("FeedScreen", () => {
  it("shows the events the repository returns", async () => {
    renderApp(new FakeEventRepository());
    expect(await screen.findByText("Free samosas")).toBeInTheDocument();
    expect(screen.getByText("Sausage sizzle")).toBeInTheDocument();
    expect(screen.getByText("14 portions left")).toBeInTheDocument();
  });

  it("says All gone rather than 0 portions left", async () => {
    renderApp(new FakeEventRepository());
    expect(await screen.findByText("All gone")).toBeInTheDocument();
  });

  it("shows a skeleton while the request is still in flight", () => {
    const repository = new FakeEventRepository();
    repository.neverAnswers = true;
    renderApp(repository);
    expect(screen.getByRole("status")).toBeInTheDocument();
    expect(screen.queryByText("Free samosas")).not.toBeInTheDocument();
  });

  it("shows a plain-language error and a way to retry", async () => {
    const repository = new FakeEventRepository();
    repository.shouldThrow = true;
    renderApp(repository);
    expect(await screen.findByRole("alert")).toHaveTextContent(
      /couldn.t reach the kai server/i,
    );
    expect(screen.getByRole("button", { name: /try again/i })).toBeInTheDocument();
  });

  it("shows the empty state rather than a blank page when there is no kai", async () => {
    renderApp(new FakeEventRepository([]));
    expect(
      await screen.findByText(/no free kai on campus right now/i),
    ).toBeInTheDocument();
  });

  it("distinguishes an empty search from an empty campus", async () => {
    const user = userEvent.setup();
    renderApp(new FakeEventRepository());
    await screen.findByText("Free samosas");
    await user.type(screen.getByRole("searchbox"), "pavlova");
    expect(await screen.findByText(/no events match/i)).toBeInTheDocument();
  });

  it("filters the list as the organiser types", async () => {
    const user = userEvent.setup();
    renderApp(new FakeEventRepository());
    await screen.findByText("Free samosas");
    await user.type(screen.getByRole("searchbox"), "quad");
    await waitFor(() =>
      expect(screen.queryByText("Free samosas")).not.toBeInTheDocument(),
    );
    expect(screen.getByText("Sausage sizzle")).toBeInTheDocument();
  });

  it("recovers when the retry succeeds", async () => {
    const user = userEvent.setup();
    const repository = new FakeEventRepository();
    repository.shouldThrow = true;
    renderApp(repository);
    await screen.findByRole("alert");
    repository.shouldThrow = false;
    await user.click(screen.getByRole("button", { name: /try again/i }));
    expect(await screen.findByText("Free samosas")).toBeInTheDocument();
  });
});

describe("selection", () => {
  it("shows nothing until something is ticked", async () => {
    renderApp(new FakeEventRepository());
    await screen.findByText("Free samosas");
    expect(screen.queryByText(/selected/)).not.toBeInTheDocument();
  });

  it("counts what is ticked and totals their portions", async () => {
    const user = userEvent.setup();
    renderApp(new FakeEventRepository());
    await screen.findByText("Free samosas");

    await user.click(screen.getByRole("checkbox", { name: "Select Free samosas" }));
    expect(await screen.findByRole("status")).toHaveTextContent("1 selected");
    expect(screen.getByRole("status")).toHaveTextContent("14 portions");

    await user.click(screen.getByRole("checkbox", { name: "Select Sausage sizzle" }));
    expect(screen.getByRole("status")).toHaveTextContent("2 selected");
    expect(screen.getByRole("status")).toHaveTextContent("52 portions");
  });

  it("unticks what was ticked", async () => {
    const user = userEvent.setup();
    renderApp(new FakeEventRepository());
    await screen.findByText("Free samosas");

    const box = screen.getByRole("checkbox", { name: "Select Free samosas" });
    await user.click(box);
    await user.click(box);
    expect(screen.queryByText(/selected/)).not.toBeInTheDocument();
  });

  it("clears the whole selection at once", async () => {
    const user = userEvent.setup();
    renderApp(new FakeEventRepository());
    await screen.findByText("Free samosas");

    await user.click(screen.getByRole("checkbox", { name: "Select Free samosas" }));
    await user.click(screen.getByRole("checkbox", { name: "Select Club barbecue" }));
    await user.click(screen.getByRole("button", { name: "Clear" }));

    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    expect(
      screen.getByRole("checkbox", { name: "Select Free samosas" }),
    ).not.toBeChecked();
  });

  it("keeps a tick attached to its event when the list is filtered", async () => {
    const user = userEvent.setup();
    renderApp(new FakeEventRepository());
    await screen.findByText("Free samosas");

    await user.click(screen.getByRole("checkbox", { name: "Select Sausage sizzle" }));
    await user.type(screen.getByRole("searchbox"), "sausage");

    expect(
      await screen.findByRole("checkbox", { name: "Select Sausage sizzle" }),
    ).toBeChecked();
  });
});

describe("accessibility", () => {
  it("gives every interactive control an accessible name", async () => {
    renderApp(new FakeEventRepository());
    await screen.findByText("Free samosas");
    for (const control of [
      ...screen.getAllByRole("button"),
      ...screen.getAllByRole("checkbox"),
    ]) {
      expect(control).toHaveAccessibleName();
    }
  });

  it("exposes one real checkbox per event", async () => {
    renderApp(new FakeEventRepository());
    await screen.findByText("Free samosas");
    expect(screen.getAllByRole("checkbox")).toHaveLength(sampleEvents.length);
  });

  // jsdom does no layout and does not apply the stylesheet, so tap-target size
  // and colour contrast cannot be asserted here. Those need a real browser.
});

describe("organisers", () => {
  it("shows every event under All events", async () => {
    renderApp(new FakeEventRepository());
    expect(await screen.findByText("Free samosas")).toBeInTheDocument();
    expect(screen.getByText("Sausage sizzle")).toBeInTheDocument();
  });

  it("narrows to the acting organiser's own events", async () => {
    const user = userEvent.setup();
    renderApp(new FakeEventRepository());
    await screen.findByText("Free samosas");

    await user.click(screen.getByRole("button", { name: "My events" }));

    // Priya (u1) posted the samosas; Tane (u2) posted the sausage sizzle.
    expect(screen.getByText("Free samosas")).toBeInTheDocument();
    expect(screen.queryByText("Sausage sizzle")).not.toBeInTheDocument();
  });

  it("follows the acting-as selector", async () => {
    const user = userEvent.setup();
    renderApp(new FakeEventRepository());
    await screen.findByText("Free samosas");

    await user.click(screen.getByRole("button", { name: "My events" }));
    await user.selectOptions(screen.getByLabelText("Acting as"), "u2");

    expect(await screen.findByText("Sausage sizzle")).toBeInTheDocument();
    expect(screen.queryByText("Free samosas")).not.toBeInTheDocument();
  });

  it("distinguishes an organiser with no events from an empty campus", async () => {
    const user = userEvent.setup();
    const organiser = ORGANISERS[2];
    renderApp(
      new FakeEventRepository(
        sampleEvents.filter((e) => e.postedById !== organiser.id),
      ),
    );
    await screen.findByText("Free samosas");

    await user.click(screen.getByRole("button", { name: "My events" }));
    await user.selectOptions(screen.getByLabelText("Acting as"), organiser.id);
    expect(
      await screen.findByText(new RegExp(`${organiser.name} hasn.t posted`, "i")),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "All events" }));
    expect(screen.queryByText(/hasn.t posted anything yet/i)).not.toBeInTheDocument();
    expect(screen.getByText("Free samosas")).toBeInTheDocument();
  });
});
