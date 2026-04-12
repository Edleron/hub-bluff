import { setup } from "xstate";

export type AppEvent =
  | { type: "INIT_COMPLETE" }
  | { type: "LOADED" }
  | { type: "PAUSE" }
  | { type: "RESUME" }
  | { type: "OPEN_SETTINGS" }
  | { type: "CLOSE_SETTINGS" };

export const appMachine = setup({
  types: {
    events: {} as AppEvent,
  },
}).createMachine({
  id: "app",
  initial: "boot",
  states: {
    boot: {
      on: { INIT_COMPLETE: "loading" },
    },
    loading: {
      on: { LOADED: "main" },
    },
    main: {
      initial: "idle",
      states: {
        idle: {
          on: {
            PAUSE: "paused",
            OPEN_SETTINGS: "settings",
          },
        },
        paused: {
          on: { RESUME: "idle" },
        },
        settings: {
          on: { CLOSE_SETTINGS: "idle" },
        },
      },
    },
  },
});
