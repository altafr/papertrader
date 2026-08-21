const DEFAULT_API_PORT = 3001;

export function getServerPort(environment = process.env): number {
  const rawPort = environment.PORT;

  if (rawPort === undefined) {
    return DEFAULT_API_PORT;
  }

  const parsedPort = Number.parseInt(rawPort, 10);

  if (!Number.isSafeInteger(parsedPort) || parsedPort < 1 || parsedPort > 65_535) {
    throw new Error("PORT must be an integer between 1 and 65535.");
  }

  return parsedPort;
}
