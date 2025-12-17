/**
 * PropertyAudit Module
 * GEO (Generative Engine Optimization) tracking for properties
 */

// Types
export * from './types'

// Connectors
export { OpenAIConnector } from './openai-connector'
export { ClaudeConnector } from './claude-connector'

// Evaluator
export {
  evaluateAnswer,
  scoreAnswer,
  aggregateScores,
  getScoreBucket,
  getScoreColor,
  getScoreBgColor,
  type ScoreBucket
} from './evaluator'
