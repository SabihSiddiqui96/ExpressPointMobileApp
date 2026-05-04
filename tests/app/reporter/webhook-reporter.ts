export type AppAutomationResult = {
  total: number;
  passed: number;
  failed: number;
  pipelineUrl?: string;
};

export function buildRingCentralMessage(result: AppAutomationResult): string {
  const status = result.failed > 0 ? 'completed with failures' : 'completed';
  const link = result.pipelineUrl ? `\n\nPipeline: ${result.pipelineUrl}` : '';

  return [
    `ExpressPoint App Automation ${status}.`,
    '',
    `Passed: ${result.passed} | Failed: ${result.failed} | Total: ${result.total}`,
    link,
  ].join('\n');
}
