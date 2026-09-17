import { useState } from "react";
import { FeedScreen } from "./features/feed/FeedScreen";
import { PostEventScreen } from "./features/post/PostEventScreen";
import { OrganiserPicker } from "./features/organiser/OrganiserPicker";
import { SelectionProvider } from "./state/SelectionContext";
import { OrganiserProvider } from "./state/OrganiserContext";
import { RepositoryProvider } from "./state/RepositoryContext";
import type { EventRepository } from "./data/event_repository";

/** `repository` is optional; tests pass a fake, the app leaves it undefined. */
export function App({ repository }: { repository?: EventRepository } = {}) {
  const [screen, setScreen] = useState<"feed" | "post">("feed");

  return (
    <RepositoryProvider repository={repository}>
      <OrganiserProvider>
        <SelectionProvider>
          <div className="app">
            <header className="app__bar">
              <h1>Kai Finder {"\u00B7"} Organiser</h1>
              <OrganiserPicker />
            </header>

            <nav className="tabs" aria-label="Sections">
              <button
                type="button"
                aria-current={screen === "feed" ? "page" : undefined}
                onClick={() => setScreen("feed")}
              >
                Events
              </button>
              <button
                type="button"
                aria-current={screen === "post" ? "page" : undefined}
                onClick={() => setScreen("post")}
              >
                Post
              </button>
            </nav>

            <main className="app__main">
              {screen === "feed" ? <FeedScreen /> : <PostEventScreen />}
            </main>
          </div>
        </SelectionProvider>
      </OrganiserProvider>
    </RepositoryProvider>
  );
}
