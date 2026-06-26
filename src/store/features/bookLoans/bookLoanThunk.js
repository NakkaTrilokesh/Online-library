import { createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../../utils/api';
import { getHeaders } from '../../../utils/getHeaders';
import { demoBookLoans } from '../../../utils/demoData';

const API_URL = '/api/book-loans';
const LOCAL_DEMO_ENABLED = import.meta.env.VITE_LOCAL_DEMO !== 'false';

const getDemoLoanById = (loanId) =>
  demoBookLoans.find((loan) => loan.id.toString() === loanId.toString());

const pageDemoBookLoans = (loans, page, size) => {
  const totalElements = loans.length;
  const totalPages = Math.max(1, Math.ceil(totalElements / size));
  const start = page * size;
  const content = loans.slice(start, start + size);
  return {
    content,
    totalElements,
    totalPages,
    number: page,
    size,
    first: page === 0,
    last: page >= totalPages - 1,
    empty: content.length === 0,
  };
};

const filterDemoBookLoans = (status) => {
  if (status === null || status === undefined) {
    return demoBookLoans;
  }
  if (typeof status === 'boolean') {
    return status
      ? demoBookLoans.filter((loan) => loan.status === 'CHECKED_OUT')
      : demoBookLoans;
  }
  return demoBookLoans.filter((loan) => loan.status === status);
};

// ==================== CHECKOUT OPERATIONS ====================

/**
 * Checkout a book for current authenticated user
 * POST /api/book-loans/checkout
 */
export const checkoutBook = createAsyncThunk(
  'bookLoans/checkoutBook',
  async (checkoutRequest, { rejectWithValue }) => {
    try {
      const response = await api.post(`${API_URL}/checkout`, checkoutRequest, {
        headers: getHeaders(),
      });
      return response.data;
    } catch (error) {
      console.log("checkout error ", error)
      return rejectWithValue(error.response?.data?.message || 'Checkout failed');
    }
  }
);

/**
 * Checkout a book for a specific user (admin operation)
 * POST /api/book-loans/checkout/user/{userId}
 */
export const checkoutBookForUser = createAsyncThunk(
  'bookLoans/checkoutBookForUser',
  async ({ userId, checkoutRequest }, { rejectWithValue }) => {
    try {
      const response = await api.post(`${API_URL}/checkout/user/${userId}`, checkoutRequest, {
        headers: getHeaders(),
      });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Checkout failed for user');
    }
  }
);

// ==================== CHECKIN OPERATIONS ====================

/**
 * Check in / return a book
 * POST /api/book-loans/checkin
 */
export const checkinBook = createAsyncThunk(
  'bookLoans/checkinBook',
  async (checkinRequest, { rejectWithValue }) => {
    try {
      if (LOCAL_DEMO_ENABLED) {
        const loanId = checkinRequest?.bookLoanId || checkinRequest?.id;
        const loan = getDemoLoanById(loanId);
        if (!loan) {
          return rejectWithValue('Loan not found');
        }
        loan.status = 'RETURNED';
        loan.returnDate = new Date().toISOString();
        return { ...loan };
      }
      const response = await api.post(`${API_URL}/checkin`, checkinRequest, {
        headers: getHeaders(),
      });
      return response.data;
    } catch (error) {
      console.log("error ", error)
      return rejectWithValue(error.response?.data?.message || 'Checkin failed');
    }
  }
);

// ==================== RENEWAL OPERATIONS ====================

/**
 * Renew a book checkout (extend due date)
 * POST /api/book-loans/renew
 */
export const renewCheckout = createAsyncThunk(
  'bookLoans/renewCheckout',
  async (renewalRequest, { rejectWithValue }) => {
    try {
      if (LOCAL_DEMO_ENABLED) {
        const loan = getDemoLoanById(renewalRequest);
        if (!loan) {
          return rejectWithValue('Loan not found');
        }
        if (loan.renewalCount >= loan.maxRenewals) {
          return rejectWithValue('Maximum renewals reached');
        }
        const newDueDate = new Date(loan.dueDate);
        newDueDate.setDate(newDueDate.getDate() + 14);
        loan.renewalCount += 1;
        loan.dueDate = newDueDate.toISOString();
        loan.isOverdue = false;
        return { ...loan };
      }
      const response = await api.post(`${API_URL}/renew`, renewalRequest, {
        headers: getHeaders(),
      });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Renewal failed');
    }
  }
);

// ==================== QUERY OPERATIONS ====================

/**
 * Get book loan by ID
 * GET /api/book-loans/{id}
 */
export const getBookLoanById = createAsyncThunk(
  'bookLoans/getBookLoanById',
  async (id, { rejectWithValue }) => {
    try {
      const response = await api.get(`${API_URL}/${id}`, {
        headers: getHeaders(),
      });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch book loan');
    }
  }
);

/**
 * Get my book loans with optional status filter
 * GET /api/book-loans/my?status=ACTIVE&page=0&size=20
 * @param status - Boolean: true for active loans only, false/null for all history
 */
export const fetchMyBookLoans = createAsyncThunk(
  'bookLoans/fetchMyBookLoans',
  async ({ status = false, page = 0, size = 20 }, { rejectWithValue }) => {
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        size: size.toString(),
      });
      if (status !== null) {
        params.append('status', status.toString());
      }
      const response = await api.get(`${API_URL}/my?${params}`, {
        headers: getHeaders(),
      });
      console.log('Fetched my book loans:', response.data);
      return { data: response.data, status };
    } catch (error) {
      if (LOCAL_DEMO_ENABLED) {
        const filteredLoans = filterDemoBookLoans(status);
        return {
          data: pageDemoBookLoans(filteredLoans, page, size),
          status,
        };
      }
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch book loans');
    }
  }
);

/**
 * Get book loans for a specific user (Admin only)
 * GET /api/book-loans/user/{userId}?status=ACTIVE&page=0&size=20
 */
export const getUserBookLoans = createAsyncThunk(
  'bookLoans/getUserBookLoans',
  async ({ userId, status = null, page = 0, size = 20 }, { rejectWithValue }) => {
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        size: size.toString(),
      });
      if (status !== null) {
        params.append('status', status.toString());
      }
      const response = await api.get(`${API_URL}/user/${userId}?${params}`, {
        headers: getHeaders(),
      });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch user book loans');
    }
  }
);



/**
 * Search book loans with filters (Admin only)
 * POST /api/book-loans/search
 */
export const getAllBookLoans = createAsyncThunk(
  'bookLoans/getAllBookLoans',
  async (searchRequest, { rejectWithValue }) => {
    try {
      const response = await api.post(`${API_URL}/search`, searchRequest, {
        headers: getHeaders(),
      });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to search book loans');
    }
  }
);





// ==================== FINE OPERATIONS ====================

/**
 * Pay fine for a book loan
 * POST /api/book-loans/{id}/pay-fine
 */
export const payFine = createAsyncThunk(
  'bookLoans/payFine',
  async (loanId, { rejectWithValue }) => {
    try {
      if (LOCAL_DEMO_ENABLED) {
        const loan = getDemoLoanById(loanId);
        if (!loan) {
          return rejectWithValue('Loan not found');
        }
        loan.fineAmount = 0;
        loan.finePaid = true;
        return { ...loan };
      }
      const response = await api.post(`${API_URL}/${loanId}/pay-fine`, {}, {
        headers: getHeaders(),
      });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Payment failed');
    }
  }
);

/**
 * Get my unpaid fines (current user)
 * GET /api/book-loans/my/unpaid-fines
 */
export const fetchUnpaidFines = createAsyncThunk(
  'bookLoans/fetchUnpaidFines',
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get(`${API_URL}/my/unpaid-fines`, {
        headers: getHeaders(),
      });
      return response.data.totalUnpaidFines;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch fines');
    }
  }
);

/**
 * Get unpaid fines for a specific user (Admin only)
 * GET /api/book-loans/user/{userId}/unpaid-fines
 */
export const getUserUnpaidFines = createAsyncThunk(
  'bookLoans/getUserUnpaidFines',
  async (userId, { rejectWithValue }) => {
    try {
      const response = await api.get(`${API_URL}/user/${userId}/unpaid-fines`, {
        headers: getHeaders(),
      });
      return response.data.totalUnpaidFines;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch user unpaid fines');
    }
  }
);

// ==================== ADMIN OPERATIONS ====================

/**
 * Update a book loan (Admin only)
 * PUT /api/book-loans/{id}
 */
export const updateBookLoan = createAsyncThunk(
  'bookLoans/updateBookLoan',
  async ({ bookLoanId, updateRequest }, { rejectWithValue }) => {
    try {
      const response = await api.put(`${API_URL}/${bookLoanId}`, updateRequest, {
        headers: getHeaders(),
      });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to update book loan');
    }
  }
);

/**
 * Update overdue book loans (Admin only)
 * POST /api/book-loans/admin/update-overdue
 */
export const updateOverdueBookLoans = createAsyncThunk(
  'bookLoans/updateOverdueBookLoans',
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.post(`${API_URL}/admin/update-overdue`, {}, {
        headers: getHeaders(),
      });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to update overdue loans');
    }
  }
);

/**
 * Get checkout statistics (Admin only)
 * GET /api/book-loans/statistics
 */
export const getCheckoutStatistics = createAsyncThunk(
  'bookLoans/getCheckoutStatistics',
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get(`${API_URL}/statistics`, {
        headers: getHeaders(),
      });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch statistics');
    }
  }
);
