import { Language } from './common'

export interface EditorState {
  activeFileId?: string
  openFiles: EditorFile[]
  cursorPosition: EditorPosition
  selection?: EditorRange
  scrollPosition: EditorScrollPosition
  viewState: Record<string, unknown>
}

export interface EditorFile {
  id: string
  name: string
  path: string
  content: string
  language: Language
  isDirty: boolean
  isReadonly: boolean
  lastModified: Date
  version: number
}

export interface EditorPosition {
  line: number
  column: number
}

export interface EditorRange {
  start: EditorPosition
  end: EditorPosition
}

export interface EditorScrollPosition {
  scrollTop: number
  scrollLeft: number
}

export interface EditorAction {
  type: EditorActionType
  payload: unknown
  timestamp: Date
  userId?: string
}

export type EditorActionType =
  | 'INSERT_TEXT'
  | 'DELETE_TEXT'
  | 'REPLACE_TEXT'
  | 'MOVE_CURSOR'
  | 'SELECT_TEXT'
  | 'FORMAT_DOCUMENT'
  | 'SAVE_FILE'
  | 'CLOSE_FILE'
  | 'OPEN_FILE'

export interface TextEdit {
  range: EditorRange
  text: string
}

export interface EditorDiagnostic {
  range: EditorRange
  message: string
  severity: DiagnosticSeverity
  code?: string | number
  source?: string
  tags?: DiagnosticTag[]
  relatedInformation?: DiagnosticRelatedInformation[]
}

export enum DiagnosticSeverity {
  Error = 1,
  Warning = 2,
  Information = 3,
  Hint = 4
}

export enum DiagnosticTag {
  Unnecessary = 1,
  Deprecated = 2
}

export interface DiagnosticRelatedInformation {
  location: {
    uri: string
    range: EditorRange
  }
  message: string
}

export interface CompletionItem {
  label: string
  kind: CompletionItemKind
  detail?: string
  documentation?: string
  insertText?: string
  filterText?: string
  sortText?: string
  additionalTextEdits?: TextEdit[]
  command?: Command
}

export enum CompletionItemKind {
  Text = 1,
  Method = 2,
  Function = 3,
  Constructor = 4,
  Field = 5,
  Variable = 6,
  Class = 7,
  Interface = 8,
  Module = 9,
  Property = 10,
  Unit = 11,
  Value = 12,
  Enum = 13,
  Keyword = 14,
  Snippet = 15,
  Color = 16,
  File = 17,
  Reference = 18,
  Folder = 19,
  EnumMember = 20,
  Constant = 21,
  Struct = 22,
  Event = 23,
  Operator = 24,
  TypeParameter = 25
}

export interface Command {
  title: string
  command: string
  arguments?: unknown[]
}

export interface Hover {
  contents: string | string[]
  range?: EditorRange
}

export interface SignatureHelp {
  signatures: SignatureInformation[]
  activeSignature?: number
  activeParameter?: number
}

export interface SignatureInformation {
  label: string
  documentation?: string
  parameters?: ParameterInformation[]
}

export interface ParameterInformation {
  label: string | [number, number]
  documentation?: string
}

export interface CodeAction {
  title: string
  kind?: CodeActionKind
  diagnostics?: EditorDiagnostic[]
  edit?: WorkspaceEdit
  command?: Command
  isPreferred?: boolean
}

export enum CodeActionKind {
  QuickFix = 'quickfix',
  Refactor = 'refactor',
  RefactorExtract = 'refactor.extract',
  RefactorInline = 'refactor.inline',
  RefactorRewrite = 'refactor.rewrite',
  Source = 'source',
  SourceOrganizeImports = 'source.organizeImports',
  SourceFixAll = 'source.fixAll'
}

export interface WorkspaceEdit {
  changes?: Record<string, TextEdit[]>
  documentChanges?: TextDocumentEdit[]
}

export interface TextDocumentEdit {
  textDocument: {
    uri: string
    version: number
  }
  edits: TextEdit[]
}

export interface EditorTheme {
  name: string
  type: 'light' | 'dark'
  colors: Record<string, string>
  tokenColors: TokenColor[]
}

export interface TokenColor {
  scope: string | string[]
  settings: {
    foreground?: string
    background?: string
    fontStyle?: string
  }
}