# Persistent Applet Menu Stability Design

## Scope

Replace click-time full menu rebuilds in both Cinnamon applets with persistent,
pool-backed menu rows while preserving existing display modes, grouping,
sorting, highlighting, tooltips, profile actions, loading/configuration states,
and static footer actions.

Each rendered view may show at most 200 users after its existing filtering and
sorting. Headers, separators, loading/configuration messages, the truncation
notice, and footer actions do not count as users. If users are omitted, the
view shows `<N> weitere Benutzer nicht angezeigt` with the exact omitted count.

## Menu architecture

Each applet creates its popup, a persistent dynamic content section, and its
static footer exactly once. The dynamic section owns a grow-only row-slot pool.
A slot contains one label item, one separator item, one stable activation
signal, mutable activation data, and an optional reusable tooltip. Rendering
turns current applet data into row descriptors and updates existing slots in
place. Unused slots are hidden; actors are neither removed nor recreated.

The helper first applies its existing Standalone filter and display sort, then
caps the resulting users at 200. Activity grouping remains active/inactive/error
and is capped in that displayed order. Group and metadata descriptors are
rendered independently from the user count so they cannot consume the limit.

Profile callbacks read `slot.currentUsername` at activation time. Configuration
callbacks similarly read a mutable action field. This keeps an already-open
menu and its callbacks current after refreshes or settings changes.

## Request lifecycle

Each applet owns one current request batch. Soup 3 requests share a per-batch
`Gio.Cancellable`; Soup 2 messages are stored in a per-instance collection.
Starting a new refresh cancels the previous batch. Completion removes each
message from tracking. Applet teardown marks the instance removed, advances the
generation, cancels both Soup request forms, removes timers, destroys pooled
tooltips/menu actors, finalizes settings, and releases references.

## Tests

Node-backed behavioral tests use small Cinnamon actor/menu doubles but execute
the real applet prototype methods. Tests prove:

- repeat renders preserve row actor and signal identity;
- an open menu updates in place and activation reads the latest username;
- 200 users render without a notice, while 201 render 200 users plus the exact
  one-user notice;
- Soup 2 messages and Soup 3 cancellables are cancelled on refresh/teardown;
- teardown releases menu, settings, request trackers, slots, and tooltips.

Every production change follows a witnessed failing test, then targeted GREEN,
then the complete suite.
