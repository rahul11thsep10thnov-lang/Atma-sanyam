// Content-library data model.
//
// This is the client-side contract for a remote, database-backed image
// catalog: nothing here is bundled in the app binary — every image is
// fetched by URL from a CDN, paginated, and cached to disk on demand.
// New images/categories are added on the backend only; the client never
// needs a new release to see them.

export interface ContentImage {
  imageId: string;
  title: string;
  category: string;
  subcategory: string | null;
  tags: string[];
  thumbnailUrl: string;
  mediumImageUrl: string;
  fullImageUrl: string;
  source: string;
  creator: string;
  license: string;
  attributionRequired: boolean;
  attributionText: string | null;
  createdAt: string; // ISO 8601
  popularity: number;
}

// A hierarchical category node, e.g. Religion -> Shiva -> Mahadev is three
// CategoryNode rows chained by parentId (root nodes have parentId: null).
export interface CategoryNode {
  id: string;
  name: string;
  parentId: string | null;
}

export type SortOrder = 'newest' | 'popular' | 'title';

export interface ContentQuery {
  search?: string;
  categoryId?: string;
  tags?: string[];
  sort?: SortOrder;
  limit?: number;
  cursor?: string | null;
}

export interface Page<T> {
  items: T[];
  nextCursor: string | null;
}
