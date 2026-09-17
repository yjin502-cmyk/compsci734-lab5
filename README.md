# Lab 05: Extending the Organiser Dashboard

**COMPSCI 734 - Mobile, Web & Enterprise Computing. Week Seven, Thursday.**

Monday's lecture put a web client on the same backend. Tuesday's lecture introduced a CI (continuous integration) pipeline. Today you use both: you extend the dashboard, and the pipeline checks every change before it gets to main.

You start from where Tuesday's lecture finished. You have the Kai Finder organiser dashboard - a feed with all event cards, multi-select, an acting-as organiser picker, a post form that writes through GraphQL, **thirty-one passing tests**, and a workflow that runs them on every push and every pull request.

Tasks 1 through 4 are the **core tasks**. Tasks 5 and 6 are **extensions**. Picking the extensions up later in the week is ok, and they are all excellent practice for your team projects. You're welcome to do the lab activities individually, or in pairs / teams - your choice.

**You do this lab the way a team works.** A branch and a pull request for every task. The pipeline you saw on Tuesday checks each one before it reaches your main. You will push at least four times today. The workflow never changes; what changes is how much it is checking, because every task ships with its own tests.

## Task 0: pre-flight

### 1. Check your Node version

```
node -v
```

You need **v22 or newer**. If that fails, install the LTS build from nodejs.org and open a new terminal.

### 2. Make your own copy of this repository

Click **Use this template** (the green button, top right of this page) and create a repository **under your own account**. Not a fork, not a clone of this template repo - in one of the tasks, you are going to change repository settings, and you can only do that on a repository you own.

Then clone your copy and install:

```
git clone https://github.com/YOUR-USERNAME/YOUR-REPO.git
cd YOUR-REPO
npm ci
```

`npm ci` rather than `npm install`: it installs exactly what `package-lock.json` records and fails if the lockfile and `package.json` have drifted apart. Same reason the workflow uses it.

### 3. Start your own Kai Events server

**Use the one bundled in this repository.** In a separate terminal, from this directory:

```
npm run kai-server
```

Port **3734**, in memory, no credentials, no Firebase project, works offline. Six events, each losing a random 0-2 portions every fifteen seconds, logged so you can watch them go. `curl -X POST localhost:3734/reset` puts the food back.

This is a lightweight mock GraphQL server. You do not need Firestore, you do not need your service account key, and nothing today writes to a real database.

It supports the same REST routes and GraphQL operations as example_06_kai_firebase, so what you build here will also work against the database-backed version. For this lab, we have also added a deleteEvent GraphQL mutation, which we’ll use to delete events from the UI.

There are two important differences from the Firebase version: this server matches GraphQL operations by name rather than fully parsing the query, so it returns the whole event regardless of which fields you select; and all data is kept in memory, so it resets whenever you stop the server.

**If you see `EADDRINUSE: address already in use :::3734`,** a Kai server is already running somewhere, often in a terminal tab you forgot about. `lsof -i :3734` finds it.

### 4. Run the dashboard

```
npm run dev
```

Port **5734**. You should see six events, the organiser picker in the top right, and the post form behind the Post tab.

### 5. Run the tests

```
npm test
```

Thirty-one tests, about five seconds.

### 6. Turn the pipeline on

Push once, so the workflow runs on your lab repository:

```
git commit --allow-empty -m "Hello from my copy"
git push
```

Open the **Actions** tab. You should see `web-ci` go green in a minute or so.

Then **Settings > Branches > Add branch ruleset** (or **Add rule**, depending on what your account shows) for `main`:

- Require a pull request before merging
- Require status checks to pass, and tick **`quality`**
- Leave "Require approvals" **off** - you will be merging your own pull requests today, and GitHub will not let you approve your own work

**Checkpoint:** the dashboard runs against your own server, thirty-one tests pass, `web-ci` is green in your Actions tab, and `git push origin main` is now refused "changes must be made through a pull request". That is not a mistake, it is the rule you just added. From here everything reaches main on a branch, through a pull request, past a green check.

## What you are starting with

The folder shape is the one from Monday: features own screens, `data/` owns everything about where information comes from.

| File | What lives there |
| ---- | ---------------- |
| `src/App.tsx` | The shell: the two tabs, and the three context providers wrapped around them |
| `src/data/kai_event.ts` | The `KaiEvent` type and `kaiEventFromJson`. **Everything that deals with raw JSON lives here** |
| `src/data/kai_user.ts` | The `KaiUser` type, and the four organisers the picker offers |
| `src/data/event_repository.ts` | The `EventRepository` interface: everything the UI is allowed to ask for |
| `src/data/kai_api_service.ts` | The real implementation. REST for reads, a GraphQL mutation for the write. Both `baseUrl` and `fetch` are injectable |
| `src/data/fake_event_repository.ts` | The test double, with canned events and a `shouldThrow` flag |
| `src/hooks/useEvents.ts` | Loads the list and exposes `{ events, error, loading, reload }`, with an `AbortController` so a slow response cannot overwrite a fast one |
| `src/features/feed/FeedScreen.tsx` | The feed: scope, search, and the four states |
| `src/features/feed/KaiEventList.tsx` | The list, and `KaiEventCard` beneath it |
| `src/features/feed/SelectionBar.tsx` | Multi-select, and what you can do with a selection |
| `src/features/post/PostEventScreen.tsx` | The form, and the GraphQL write behind it |
| `src/state/` | Three contexts: the repository, the acting-as organiser, and the selection |

And the parts that are new since Monday:

| File | What lives there |
| ---- | ---------------- |
| `.github/workflows/web-ci.yml` | The pipeline. Typecheck, test, build, keep the output. Read it once now |
| `tools/kai-dev-server.mjs` | The Kai Events server, in memory, so nobody is blocked on a Firebase project. The same REST routes and GraphQL operations as `example_06_kai_firebase`, including the `deleteEvent` you need for Task 3 |

**`RepositoryProvider` is your friend.** Every test starts by rendering `<App repository={fake} />`, which swaps the whole data layer underneath the real UI. Read `FeedScreen.test.tsx` once now so you know what you already have.


## Task 1: forty events do not fit on cards

A card each is fine for six events. An organiser running orientation week has forty, and wants them as rows they can scan down in one go.

**Build:**

1. A view toggle on the feed: **Cards** and **Table**.
2. A table view: one row per event, with columns for name, location and portions left.
3. Multi-select keeps working in the table. A row ticked in one view is still ticked in the other.
4. Tests for the toggle, for the table's contents, and for a tick surviving a switch between views.

**Hints:** the two views are two ways of drawing the same array, so nothing about loading or filtering should move - `FeedScreen` already decides what `visible` is, and your table takes that list exactly as `KaiEventList` does. Selection is the interesting part: `RowCheckbox` reads from `SelectionContext` rather than from a prop, so if you reuse it in your table rows the tick follows the event for free. That is what a context is for. Use a real `<table>` with a `<thead>` and `<th scope="col">` rather than a grid of divs - Testing Library can then find things by `columnheader` and `rowheader`, and so can a screen reader.

**Checkpoint:** tick two events on cards, switch to the table, and see the same two ticked. The selection bar counts the same either way.

**Think about:** you now have two views of the same data on one screen. Would a phone ever want the table one? Say why, in one sentence, and keep the answer in mind for the rest of the lab.

## Task 2: which of mine is nearly gone?

Six events sorted by nothing in particular is a list. Forty events sorted by nothing in particular is a wall. The question an organiser actually has is which of their events is nearly out of food.

**Build:**

1. A sort control on the feed: by **name**, by **portions left**, and by **organiser**.
2. Sorting by portions left puts the ones running out where the eye lands first. You decide which end that is, and say why in a comment.
3. Sorting applies to both views from Task 1.
4. Tests: that each order is the order you claim, and that sorting survives a view switch.

**Hints:** a `Record<SortKey, (a, b) => number>` of comparator functions keeps this to about fifteen lines and keeps the branching out of your JSX. `Array.prototype.sort` sorts **in place** and returns the same array, so sorting the array `useEvents` handed you mutates state React thinks it owns - copy first, or sort at the end of the `.filter()` chain that already produces a new array. `localeCompare` for names rather than `<`, unless you want `Zucchini` before `apple`.

**Checkpoint:** sort by portions left, and the event about to run out is at the top of the list. Switch to the table. Still there.

**Think about:** you just made the nearly-empty events easy to find, and there is still nothing an organiser can do about them. That is the next task.

## Task 3: take it down

The samosas ran out twenty minutes ago. The listing is still up, three people have walked to OGGB Level 2 for nothing, and the organiser who posted it can see the problem and do absolutely nothing about it.

The server can help: `deleteEvent(id: ID!)` returns the id it removed, or `null` if there was nothing there.

**Build:**

1. `deleteEvent` on the `EventRepository` interface, and on both implementations.
2. A **Remove** control on each event, in the cards **and** in the table.
3. Remove it **optimistically**: the row goes the moment it is clicked, not when the server answers. The organiser is standing next to an empty tray and already knows the answer.
4. If the request fails, put the row back and say so. A quiet failure here means they walk away believing a listing is gone when it is still live.
5. Tests: that the row goes immediately, that the right id reached the server, and that a refusal is undone.

**Hints:** `KaiApiService` already has a private `graphql()` helper that `postEvent` uses, so the mutation is a few lines rather than a new fetch. Hold the optimistically removed ids in a `Set` and filter them out alongside every other filter, rather than keeping a second copy of the list - the feed refetches and re-sorts constantly, and two copies is two things to keep in step. In `FakeEventRepository`, check `shouldThrow` **before** you touch the array, or a "failed" delete will still remove the event and your rollback test will pass for the wrong reason. A `null` result is not a failure: the event was already gone, which is the outcome you wanted. And watch what happens to a **ticked** row when you remove it - a selection is a set of ids, and an id outlives the thing it points at, so the bar will happily report "1 selected, 0 portions between them" about an event nobody can see. Deciding where that gets cleaned up is part of the task.

**Checkpoint:** remove an event and watch the row go with no perceptible delay. Then stop the Kai server, remove another, and watch it reappear with an explanation. `curl localhost:3734/events` confirms which ones actually went, and `curl -X POST localhost:3734/reset` puts all six back once you have deleted your way to an empty screen.

**Think about:** you have now built one screen that lies briefly and corrects itself. Would you rather use that, or one that told the truth slowly? Does the answer change if the request fails one time in ten rather than one in ten thousand?

## Task 4: five at once

Orientation week is over. Eleven of your events finished this afternoon and every one of them is still listed. You can tick all eleven - the selection bar has counted them since Monday - and then you have to click Remove eleven times.

**Build:**

1. A **Remove selected** button on the selection bar.
2. It removes every ticked event, and clears the selection when it is done.
3. Some of them may fail. Say how many, and leave the ones that failed still listed and still ticked, so a second attempt is one click.
4. Tests: that all of them go, and that a partial failure leaves exactly the right rows behind.

**Hints:** the single-event removal from Task 3 already does the optimistic-and-rollback dance, so the honest question is whether eleven removals are eleven calls to it or one new path. Try the simple version first and see what breaks. `Promise.allSettled` is the difference between "one failure sinks the batch" and "eight went, three did not" - `Promise.all` rejects on the first failure and abandons the rest, which is not what an organiser wants. Removing while iterating over the thing you are removing from is the classic way to skip every second item; work from a snapshot of the selected ids. And think about what the button should say while eleven requests are in flight.

**Checkpoint:** tick five, remove them all, and watch five rows go and the bar disappear. Then stop the server, tick five more, and see all five come back with a message saying so.

**Think about:** eleven requests went out at once. What would you do differently at eleven hundred, and is that a client problem or a server one?

## Task 5: make the pipeline catch something it currently misses (extension)

The workflow you inherited already typechecks, tests, builds and keeps the output. It is a reasonable pipeline. It is not a complete one, and every real pipeline grew by somebody getting burned and adding a step.

**Build:** add one check the workflow does not have yet, and say in your README what it would have caught. Pick whichever is true of your project:

- **A bundle-size budget.** `npm run build` prints the size of `dist/`. Fail the job if it grows past a number you choose. A dependency added in a hurry is the usual culprit.
- **A scheduled run.** `on: schedule:` with a cron expression runs the pipeline nightly against a repository nobody has touched. Green code with a red build is how you find out a dependency broke underneath you.
- **A lint step.** If you add ESLint, it belongs in the pipeline on the same footing as the tests.

**Hints:** read `web-ci.yml` properly before you add to it, because every block already there is worth understanding: `concurrency` cancels a run when you push again thirty seconds later; `permissions: contents: read` takes away the write access the token would otherwise have; `cache: npm` is keyed on the lockfile; and the upload step deliberately has no `if: always()` on it. Work out why that last one matters before you change it.

**Checkpoint:** download the artefact from a green run, unzip it, and serve it with `npx serve .` from **inside** the folder. Your own build, running in your own browser. Opening `index.html` by double-clicking will not work, and the reason is worth knowing.

**Think about:** the runner is a brand new machine every time and is deleted when the job ends. Everything the build produced goes with it unless something uploads it first. What does that mean for the word "release"?

## Task 6: your own project's pipeline (extension)

The highest-value thing on this page, and the only one that is not about Kai Finder.

**Build:** a workflow for **your team project repository**, from nothing. It should install dependencies, run whatever checks your project has, and run on every pull request. Then protect your team's `main` and require it.

**Hints:** Actions > New workflow gives you a starter for most stacks, and starting from one is normal. If your project has no tests yet, a typecheck or a lint is still a check worth requiring - and a pipeline that runs one real check today is worth more than a perfect one you write around submission.


## Where to look things up

- Monday's demo repo, tags `step-01-scaffold` to `step-08-who-posted`: https://github.com/UOA-CS734-S2-2026/example_09_kai_finder_web - every piece of the dashboard, in the order it was built
- The GraphQL schema, which is the contract: `example_06_kai_firebase/server/src/graphql/schema.ts`
- Every operation Lecture 08 used, in demo order: `example_06_kai_firebase/server/demo-queries.graphql`
- React: Thinking in React, and You Might Not Need an Effect - https://react.dev/learn
- Testing Library queries, and which one to reach for first - https://testing-library.com/docs/queries/about
- `Promise.allSettled` - https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/allSettled
- GitHub Actions workflow syntax - https://docs.github.com/actions/reference/workflow-syntax-for-github-actions
- Protected branches and required checks - https://docs.github.com/repositories/configuring-branches-and-merges-in-your-repository

## Help

Remember to ask in the lab session if you need help! And post on Ed Discussion any time.

A model solution is available - one commit per task, so you can compare your answer with another one or pick up a task you did not get to.

Look at the solution _after_ you have had a real go at the task, not before. The best learning comes when you're struggling with the task yourself (or in your teams).