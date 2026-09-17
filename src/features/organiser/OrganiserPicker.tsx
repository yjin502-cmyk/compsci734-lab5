import { useOrganiser } from "../../state/OrganiserContext";

/** Chooses which organiser new events are attributed to. */
export function OrganiserPicker() {
  const { organiser, organisers, setOrganiserId } = useOrganiser();

  return (
    <div className="organiser-picker">
      <label htmlFor="organiser">Acting as</label>
      <select
        id="organiser"
        value={organiser.id}
        onChange={(e) => setOrganiserId(e.target.value)}
      >
        {organisers.map((user) => (
          <option key={user.id} value={user.id}>
            {user.name} ({user.dept})
          </option>
        ))}
      </select>
      <span
        className="organiser-picker__warning"
        title="There is no sign-in yet. The server accepts whatever this says."
      >
        unverified
      </span>
    </div>
  );
}
