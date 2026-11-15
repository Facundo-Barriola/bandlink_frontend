import { client } from './client'

export interface ReviewAuthor {
  user_id: string
  username: string
  display_name: string | null
}

export interface StudioReview {
  studio_review_id: string
  studio_id: string
  user_id: string
  rating: number
  comment: string | null
  created_at: string
  users: ReviewAuthor
}

export interface UserReview {
  user_review_id: string
  user_reviewed_id: string
  user_reviewer_id: string
  rating: number
  comment: string | null
  created_at: string
  users_user_reviews_user_reviewer_idTousers: ReviewAuthor
}

export interface ReviewsResponse<T> {
  average_rating: number
  total_reviews: number
  items: T[]
}

export interface ReviewInput {
  rating: number
  comment?: string
}

export type ReportTarget = 'user' | 'studio' | 'band' | 'event' | 'booking' | 'message'

export const reviewsApi = {
  // ── Salas (CU34 / CU44) ──
  getStudioReviews: (studioId: string) =>
    client.get<ReviewsResponse<StudioReview>>(`/reviews/studios/${studioId}`).then((r) => r.data),
  createStudioReview: (studioId: string, data: ReviewInput) =>
    client.post(`/reviews/studios/${studioId}`, data).then((r) => r.data),
  updateStudioReview: (reviewId: string, data: Partial<ReviewInput>) =>
    client.patch(`/reviews/studios/reviews/${reviewId}`, data).then((r) => r.data),
  deleteStudioReview: (reviewId: string) =>
    client.delete(`/reviews/studios/reviews/${reviewId}`).then((r) => r.data),

  // ── Músicos (CU35 / CU45) ──
  getUserReviews: (userId: string) =>
    client.get<ReviewsResponse<UserReview>>(`/reviews/users/${userId}`).then((r) => r.data),
  createUserReview: (userId: string, data: ReviewInput) =>
    client.post(`/reviews/users/${userId}`, data).then((r) => r.data),
  updateUserReview: (reviewId: string, data: Partial<ReviewInput>) =>
    client.patch(`/reviews/users/reviews/${reviewId}`, data).then((r) => r.data),
  deleteUserReview: (reviewId: string) =>
    client.delete(`/reviews/users/reviews/${reviewId}`).then((r) => r.data),

  // ── Reportes (CU21) ──
  createReport: (data: { target_type: ReportTarget; target_id: string; reason: string; details?: string }) =>
    client.post('/reviews/reports', data).then((r) => r.data),
}
