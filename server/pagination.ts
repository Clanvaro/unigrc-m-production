/**
 * Paginación y respuesta estándar para endpoints
 */

export interface PaginationParams {
  limit?: number;
  offset?: number;
  page?: number;
  pageSize?: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
    page?: number;
    totalPages?: number;
  };
}

/**
 * Normaliza parámetros de paginación desde query params
 */
export function normalizePaginationParams(query: any): { limit: number; offset: number } {
  // Soporte para limit/offset O page/pageSize
  let limit = 50; // Default más razonable que 1000
  let offset = 0;

  if (query.limit) {
    limit = Math.min(parseInt(query.limit), 1000); // Max 1000 items por request
  } else if (query.pageSize) {
    limit = Math.min(parseInt(query.pageSize), 1000);
  }

  if (query.offset) {
    offset = parseInt(query.offset);
  } else if (query.page) {
    const page = parseInt(query.page);
    offset = (page - 1) * limit;
  }

  return { limit, offset };
}

/**
 * Crea una respuesta paginada estándar
 */
export function createPaginatedResponse<T>(
  data: T[],
  total: number,
  limit: number,
  offset: number
): PaginatedResponse<T> {
  const hasMore = offset + data.length < total;
  const page = Math.floor(offset / limit) + 1;
  const totalPages = Math.ceil(total / limit);

  return {
    data,
    pagination: {
      total,
      limit,
      offset,
      hasMore,
      page,
      totalPages
    }
  };
}
