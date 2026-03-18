use serde::{Deserialize, Serialize};

// ─── Pagination ──────────────────────────────────────────────────────────────

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct PaginatedResult<T> {
    pub data: Vec<T>,
    pub total: i64,
    pub page: i64,
    pub page_size: i64,
    pub total_pages: i64,
}

impl<T> PaginatedResult<T> {
    pub fn new(data: Vec<T>, total: i64, page: i64, page_size: i64) -> Self {
        let total_pages = if page_size > 0 { (total + page_size - 1) / page_size } else { 0 };
        PaginatedResult { data, total, page, page_size, total_pages }
    }
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct PaginationParams {
    pub page: i64,
    pub page_size: i64,
}

impl PaginationParams {
    pub fn offset(&self) -> i64 {
        (self.page.max(1) - 1) * self.page_size
    }
    pub fn limit(&self) -> i64 {
        self.page_size.max(1).min(200)
    }
}

impl Default for PaginationParams {
    fn default() -> Self {
        PaginationParams { page: 1, page_size: 50 }
    }
}
