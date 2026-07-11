import { useEffect, useState } from "react";

type AsyncState<T> = {
  data: T | null;
  error: string | null;
  isLoading: boolean;
};

function depsChanged(prev: unknown[], next: unknown[]) {
  if (prev.length !== next.length) return true;
  return prev.some((value, index) => !Object.is(value, next[index]));
}

export function useAsyncData<T>(
  loader: () => Promise<T>,
  dependencies: unknown[],
) {
  const [state, setState] = useState<AsyncState<T>>({
    data: null,
    error: null,
    isLoading: true,
  });

  const [prevDeps, setPrevDeps] = useState(dependencies);
  if (depsChanged(prevDeps, dependencies)) {
    setPrevDeps(dependencies);
    setState((current) => ({ ...current, error: null, isLoading: true }));
  }

  useEffect(() => {
    let cancelled = false;

    loader()
      .then((data) => {
        if (!cancelled) setState({ data, error: null, isLoading: false });
      })
      .catch((error) => {
        if (!cancelled) {
          setState({
            data: null,
            error: error instanceof Error ? error.message : "Request failed",
            isLoading: false,
          });
        }
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, dependencies);

  return state;
}
