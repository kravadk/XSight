import { Agentation } from 'agentation';

const DEFAULT_ENDPOINT = 'http://localhost:4747';

export function AgentationDev() {
  if (!import.meta.env.DEV) return null;
  if (import.meta.env.VITE_AGENTATION_ENABLED !== 'true') return null;

  return (
    <Agentation
      endpoint={import.meta.env.VITE_AGENTATION_ENDPOINT ?? DEFAULT_ENDPOINT}
      className="xsight-agentation-dev"
    />
  );
}
