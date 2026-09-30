export type ImpactLevel = 'HIGH' | 'MEDIUM' | 'LOW';

export interface AffectedComponent {
  file: string;
  component: string;
  component_type: string;
  impact_level: ImpactLevel;
  reason: string;
  evidence: string;
  line_range?: string;
  dependency_type?: string;
  is_grounded?: boolean;
}

export interface ApiImpact {
  endpoint: string;
  method?: string;
  impact_level?: ImpactLevel | string;
  reason: string;
}

export interface TestImpact {
  test_file: string;
  test_name: string;
  reason: string;
  action_required?: string;
}

export interface DocImpact {
  doc_file: string;
  section: string;
  reason: string;
}

export interface RiskItem {
  risk: string;
  severity: ImpactLevel | string;
  mitigation: string;
}

export interface ImpactReport {
  id: string;
  repository_name: string;
  analyzed_at: string;
  model_used: string;
  summary: string;
  changed_files: string[];
  affected_components: AffectedComponent[];
  api_impact: ApiImpact[];
  test_impact: TestImpact[];
  documentation_impact: DocImpact[];
  risks: RiskItem[];
  recommended_validation: string[];
  metrics: {
    changed_files: number;
    affected_files: number;
    high: number;
    medium: number;
    low: number;
  };
  raw_diff?: string;
}

export interface UserSession {
  uid: string;
  email: string;
  displayName: string;
  provider: 'google.com' | 'apple.com' | 'firebase';
  avatarUrl?: string;
}

export interface HistoryEntry {
  id: string;
  repo_name: string;
  timestamp: string;
  changed_count: number;
  affected_count: number;
  overall_impact: ImpactLevel;
  status: 'COMPLETED' | 'FAILED';
  summary: string;
  report: ImpactReport;
}

export interface CodeChunkItem {
  file: string;
  symbol: string;
  type: string;
  startLine: number;
  endLine: number;
  content: string;
  calls: string[];
  score?: number;
}
