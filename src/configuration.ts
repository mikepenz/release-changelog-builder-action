export interface Configuration {
  sort: string
  template: string
  pr_template: string
  empty_template: string
  categories: Category[]
  transformers: Transformer[]
}

export interface Category {
  title: string
  labels: string[]
}

export interface Transformer {
  pattern: string
  target: string
}

export const DefaultConfiguration: Configuration = {
  sort: 'ASC',
  template: '${{CHANGELOG}}',
  pr_template: '- ${{TITLE}}\n   - PR: #${{NUMBER}}',
  empty_template: '- no changes',
  categories: [],
  transformers: []
}
