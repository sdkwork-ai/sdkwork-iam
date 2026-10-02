import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type {
  SdkworkIamUserCenterMeController,
  SdkworkIamUserCenterMeMenuFactory,
  SdkworkIamUserCenterMeState,
} from "@sdkwork/iam-user-center-core";
import { createSdkworkIamUserCenterMeController } from "@sdkwork/iam-user-center-core";
import type { SdkworkIamService } from "@sdkwork/iam-service";

export interface UseSdkworkIamH5UserCenterMeControllerInput {
  /** Prebuilt controller (tests, hosts that own the lifecycle). */
  controller?: SdkworkIamUserCenterMeController;
  /** Menu override forwarded to the controller built from `service`. */
  menuSections?: SdkworkIamUserCenterMeMenuFactory;
  /** Injected service port used to build the controller when none is given. */
  service?: SdkworkIamService;
}

export interface SdkworkIamH5UserCenterMeControllerBinding {
  controller: SdkworkIamUserCenterMeController | undefined;
  refresh: (signal?: AbortSignal) => Promise<void>;
  state: SdkworkIamUserCenterMeState | undefined;
}

/**
 * React binding for the headless Me-page controller: subscribes the component
 * to controller state, builds the controller from the injected service when
 * needed, and performs one bounded initial load that is aborted on unmount.
 */
export function useSdkworkIamH5UserCenterMeController(
  input: UseSdkworkIamH5UserCenterMeControllerInput,
): SdkworkIamH5UserCenterMeControllerBinding {
  const { controller: injectedController, menuSections, service } = input;

  const controller = useMemo(
    () =>
      injectedController
      ?? (service
        ? createSdkworkIamUserCenterMeController({ menuSections, service })
        : undefined),
    [injectedController, menuSections, service],
  );

  const [state, setState] = useState<SdkworkIamUserCenterMeState | undefined>(() =>
    controller?.getState(),
  );

  useEffect(() => {
    if (!controller) {
      setState(undefined);
      return undefined;
    }
    setState(controller.getState());
    return controller.subscribe(setState);
  }, [controller]);

  const initialLoadRef = useRef<SdkworkIamUserCenterMeController | undefined>(undefined);
  useEffect(() => {
    if (!controller) {
      return undefined;
    }
    const abortController = new AbortController();
    if (initialLoadRef.current !== controller && controller.getState().status === "idle") {
      initialLoadRef.current = controller;
      void controller.refresh(abortController.signal);
    }
    return () => {
      abortController.abort();
    };
  }, [controller]);

  const refresh = useCallback(
    (signal?: AbortSignal) => controller?.refresh(signal) ?? Promise.resolve(),
    [controller],
  );

  return { controller, refresh, state };
}
