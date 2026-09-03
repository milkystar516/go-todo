import {
  MutationCache,
  QueryCache,
  QueryClient,
} from "@tanstack/react-query";

import { isApiErrorOfType } from "../api/client";
import { PROBLEM_TYPE } from "../api/types";
import { clearSessionCache } from "../features/auth/sessionCache";

let queryClient: QueryClient;

function handleGlobalError(error: unknown) {
  if (
    isApiErrorOfType(error, PROBLEM_TYPE.AUTHENTICATION_REQUIRED)
  ) {
    clearSessionCache(queryClient);
  }
}

const queryCache = new QueryCache({
  onError: handleGlobalError,
});

const mutationCache = new MutationCache({
  onError: handleGlobalError,
});

queryClient = new QueryClient({
  queryCache,
  mutationCache,
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: (failureCount, error) =>
        !isApiErrorOfType(
          error,
          PROBLEM_TYPE.AUTHENTICATION_REQUIRED,
        ) && failureCount < 3,
    },
  },
});

export { queryClient };
