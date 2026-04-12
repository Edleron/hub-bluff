import { ExtensionType } from "pixi.js";
import type { Application, ExtensionMetadata } from "pixi.js";
import { createActor } from "xstate";

import { appMachine } from "./appMachine";

/**
 * Middleware for Application's state machine functionality.
 *
 * Adds the following to Application:
 * * Application#stateMachine - XState actor for app state management
 */
export class CreationStatePlugin {
  public static extension: ExtensionMetadata = ExtensionType.Application;

  public static init(): void {
    const app = this as unknown as Application;
    app.stateMachine = createActor(appMachine);
    app.stateMachine.start();
  }

  public static destroy(): void {
    const app = this as unknown as Application;
    app.stateMachine.stop();
    app.stateMachine = null as unknown as Application["stateMachine"];
  }
}
