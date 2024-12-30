interface RetryConfig {
  maxRetries?: number
  initialDelay?: number
  maxDelay?: number
}

export default async function fetchWithRetry(
  url: string,
  options?: RequestInit,
  retryConfig: RetryConfig = {}
): Promise<Response> {
  const { maxRetries = 3, initialDelay = 1000, maxDelay = 10000 } = retryConfig

  let lastError: Error | null = null

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await fetch(url, options)

      // Throw immediately on 4xx client errors
      if (response.status >= 400 && response.status < 500) {
        throw new Error(
          `Client error: ${response.status}: ${await response.text()}`
        )
      }

      // Only retry on 5xx server errors
      if (response.status < 500 || response.status >= 600) {
        return response
      }

      lastError = new Error(
        `Server error: ${response.status} - ${await response.text()}`
      )

      // Calculate delay with exponential backoff
      const delay = Math.min(initialDelay * Math.pow(2, attempt), maxDelay)

      // Wait before next retry
      await new Promise((resolve) => setTimeout(resolve, delay))
    } catch (error) {
      lastError = error as Error

      // For network errors, apply the same backoff strategy
      const delay = Math.min(initialDelay * Math.pow(2, attempt), maxDelay)
      await new Promise((resolve) => setTimeout(resolve, delay))
    }
  }

  // If we've exhausted all retries, throw the last error
  throw lastError || new Error("Maximum retries reached")
}
