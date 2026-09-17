import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { App } from "../../App";
import { FakeEventRepository } from "../../data/fake_event_repository";
import { ORGANISERS } from "../../data/kai_user";

async function openPostScreen(repository: FakeEventRepository) {
  const user = userEvent.setup();
  render(<App repository={repository} />);
  await user.click(screen.getByRole("button", { name: "Post" }));
  return user;
}

describe("PostEventScreen", () => {
  it("refuses to submit without an event name", async () => {
    await openPostScreen(new FakeEventRepository());
    expect(screen.getByRole("button", { name: /post event/i })).toBeDisabled();
  });

  it("sends the trimmed form through the repository", async () => {
    const repository = new FakeEventRepository();
    const user = await openPostScreen(repository);

    await user.type(screen.getByLabelText("Event name"), "  Pizza in 401  ");
    await user.type(screen.getByLabelText("Location"), "Engineering 401");
    await user.click(screen.getByRole("button", { name: /post event/i }));

    expect(await screen.findByRole("status")).toHaveTextContent(/pizza in 401/i);
    expect(repository.postedEvents).toHaveLength(1);
    expect(repository.postedEvents[0].name).toBe("Pizza in 401");
  });

  it("clears the form after a successful post", async () => {
    const user = await openPostScreen(new FakeEventRepository());
    await user.type(screen.getByLabelText("Event name"), "Pizza in 401");
    await user.click(screen.getByRole("button", { name: /post event/i }));
    await screen.findByRole("status");
    expect(screen.getByLabelText("Event name")).toHaveValue("");
  });

  it("reports a failed write in plain language and keeps the form", async () => {
    const repository = new FakeEventRepository();
    repository.shouldThrow = true;
    const user = await openPostScreen(repository);

    await user.type(screen.getByLabelText("Event name"), "Pizza in 401");
    await user.click(screen.getByRole("button", { name: /post event/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/couldn.t post/i);
    // Losing what the organiser typed because the network failed would be its
    // own usability bug.
    expect(screen.getByLabelText("Event name")).toHaveValue("Pizza in 401");
  });

  it("marks an invalid portion count for assistive technology", async () => {
    const user = await openPostScreen(new FakeEventRepository());
    const portions = screen.getByLabelText("Portions");
    await user.clear(portions);
    await user.type(portions, "0");
    expect(portions).toHaveAttribute("aria-invalid", "true");
  });
});

describe("who posted it", () => {
  it("attributes the event to the acting organiser", async () => {
    const repository = new FakeEventRepository();
    const user = await openPostScreen(repository);

    await user.selectOptions(screen.getByLabelText("Acting as"), "u3");
    await user.type(screen.getByLabelText("Event name"), "Business mixer leftovers");
    await user.click(screen.getByRole("button", { name: /post event/i }));

    await screen.findByRole("status");
    expect(repository.postedEvents[0].postedById).toBe("u3");
  });

  it("says out loud who it is about to post as", async () => {
    const user = await openPostScreen(new FakeEventRepository());
    const organiser = ORGANISERS[3];
    await user.selectOptions(screen.getByLabelText("Acting as"), organiser.id);
    expect(screen.getByText(/posting as/i)).toHaveTextContent(organiser.name);
  });
});
