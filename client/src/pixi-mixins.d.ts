import type { Actor } from "xstate";

import type { BGM, SFX } from "./engine/audio/audio";
import type { Navigation } from "./engine/navigation/navigation";
import type {
  CreationResizePluginOptions,
  DeepRequired,
} from "./engine/resize/ResizePlugin";
import type { appMachine } from "./engine/state/appMachine";

declare global {
  namespace PixiMixins {
    interface Application extends DeepRequired<CreationResizePluginOptions> {
      audio: {
        bgm: BGM;
        sfx: SFX;
        getMasterVolume: () => number;
        setMasterVolume: (volume: number) => void;
      };
      navigation: Navigation;
      stateMachine: Actor<typeof appMachine>;
    }
    // eslint-disable-next-line @typescript-eslint/no-empty-object-type
    interface ApplicationOptions extends CreationResizePluginOptions {}
  }
}

export {};
