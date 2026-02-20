export type PageScope = 'main-article';
export type NormalizationMode = 'medium';
export type ImageMode = 'placeholder';
export type TableMode = 'cell-by-position';

export type CompareOptions = {
  pageScope: PageScope;
  normalization: NormalizationMode;
  imageMode: ImageMode;
  tableMode: TableMode;
};

export const DEFAULT_COMPARE_OPTIONS: CompareOptions = {
  pageScope: 'main-article',
  normalization: 'medium',
  imageMode: 'placeholder',
  tableMode: 'cell-by-position',
};

export type CompareRequest = {
  docPath: string;
  pageUrl: string;
  options: CompareOptions;
};

export type CompareStats = {
  leftChars: number;
  rightChars: number;
  leftBlocks: number;
  rightBlocks: number;
  leftImages: number;
  rightImages: number;
  leftTables: number;
  rightTables: number;
};

export type CompareResponse = {
  leftLabel: 'Website';
  rightLabel: 'Document';
  leftText: string;
  rightText: string;
  stats: CompareStats;
  warnings: string[];
};

export type Block =
  | { kind: 'paragraph'; text: string }
  | { kind: 'table'; rows: string[][] }
  | { kind: 'image'; token: string };

export type StructuredDocument = {
  blocks: Block[];
  plainText: string;
};

export type CompareErrorCode =
  | 'INVALID_URL'
  | 'NETWORK_ERROR'
  | 'DOCX_PARSE_FAILED'
  | 'EXTRACTION_FAILED'
  | 'UNKNOWN_ERROR';

export type CompareError = {
  code: CompareErrorCode;
  message: string;
};

export type IpcResult<T> =
  | {
      ok: true;
      data: T;
    }
  | {
      ok: false;
      error: CompareError;
    };

export type DiffCheckerApi = {
  selectDocx: () => Promise<string | null>;
  runCompare: (request: CompareRequest) => Promise<IpcResult<CompareResponse>>;
};
