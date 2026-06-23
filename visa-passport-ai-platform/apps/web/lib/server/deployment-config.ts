export type DeploymentTarget = "local" | "netlify";
export type ExtractionMode = "queue" | "mock";
export type UploadProvider = "local" | "mock";

function readChoice<T extends string>(
  name: string,
  value: string | undefined,
  fallback: T,
  choices: readonly T[],
): T {
  const configured = value?.trim().toLowerCase() || fallback;
  if (!choices.includes(configured as T)) {
    throw new Error(`${name} must be one of: ${choices.join(", ")}`);
  }
  return configured as T;
}

/** Reads deployment switches without changing the local queue/upload defaults. */
export function loadWebDeploymentConfig(source: NodeJS.ProcessEnv = process.env) {
  return {
    deploymentTarget: readChoice<DeploymentTarget>(
      "DEPLOYMENT_TARGET",
      source.DEPLOYMENT_TARGET,
      "local",
      ["local", "netlify"],
    ),
    extractionMode: readChoice<ExtractionMode>(
      "EXTRACTION_MODE",
      source.EXTRACTION_MODE,
      "queue",
      ["queue", "mock"],
    ),
    uploadProvider: readChoice<UploadProvider>(
      "UPLOAD_PROVIDER",
      source.UPLOAD_PROVIDER,
      "local",
      ["local", "mock"],
    ),
  } as const;
}
