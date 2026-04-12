import { setEngine } from "./app/getEngine";
import { PausePopup } from "./app/popups/PausePopup";
import { SettingsPopup } from "./app/popups/SettingsPopup";
import { LoadScreen } from "./app/screens/LoadScreen";
import { LobbyScreen } from "./app/screens/LobbyScreen";
import { userSettings } from "./app/utils/userSettings";
import { CreationEngine } from "./engine/engine";

/**
 * Importing these modules will automatically register their plugins with the engine.
 */
import "@pixi/sound";

// Create a new creation engine instance
const engine = new CreationEngine();
setEngine(engine);

(async () => {
  // Initialize the creation engine instance
  await engine.init({
    background: "#1E1E1E",
    resizeOptions: { minWidth: 768, minHeight: 1024, letterbox: false },
  });

  // Initialize the user settings
  userSettings.init();

  // Subscribe to state machine for popup management
  engine.stateMachine.subscribe((snapshot) => {
    if (snapshot.matches({ main: "paused" })) {
      if (!engine.navigation.currentPopup) {
        engine.navigation.presentPopup(PausePopup);
      }
    } else if (snapshot.matches({ main: "settings" })) {
      if (!engine.navigation.currentPopup) {
        engine.navigation.presentPopup(SettingsPopup);
      }
    } else if (snapshot.matches({ main: "idle" })) {
      if (engine.navigation.currentPopup) {
        engine.navigation.dismissPopup();
      }
    }
  });

  // Transition: boot → loading
  engine.stateMachine.send({ type: "INIT_COMPLETE" });

  // Show the load screen
  await engine.navigation.showScreen(LoadScreen);
  // Show the lobby screen once loading is done
  await engine.navigation.showScreen(LobbyScreen);

  // Transition: loading → main
  engine.stateMachine.send({ type: "LOADED" });

  (globalThis as unknown as Record<string, unknown>).__PIXI_STAGE__ =
    engine.stage;
  (globalThis as unknown as Record<string, unknown>).__PIXI_RENDERER__ =
    engine.renderer;
})();
