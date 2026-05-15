import { useLayoutEffect, useReducer, useState } from "react";
import { flushSync } from "react-dom";
import {
  Virtualizer,
  elementScroll,
  observeElementOffset,
  observeElementRect,
} from "@tanstack/react-virtual";

interface UseListVirtualizerOptions {
  count: number;
  getScrollElement: () => HTMLElement | null;
  estimateSize: () => number;
  overscan?: number;
  getItemKey?: (index: number) => string | number | bigint;
}

export function useListVirtualizer(options: UseListVirtualizerOptions) {
  const rerender = useReducer(() => ({}), {})[1];

  const resolvedOptions = {
    ...options,
    observeElementRect,
    observeElementOffset,
    scrollToFn: elementScroll,
    getItemKey: options.getItemKey,
    onChange: (
      _instance: Virtualizer<HTMLElement, HTMLElement>,
      sync: boolean,
    ) => {
      if (sync) {
        flushSync(rerender);
      } else {
        rerender();
      }
    },
  };

  const [instance] = useState(
    () => new Virtualizer<HTMLElement, HTMLElement>(resolvedOptions),
  );

  instance.setOptions(resolvedOptions);

  useLayoutEffect(() => {
    return instance._didMount();
  }, [instance]);

  useLayoutEffect(() => {
    instance._willUpdate();
  });

  return instance;
}
