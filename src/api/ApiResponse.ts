// shape ของ response จาก backend
export interface ApiResponse<T = any> {
  isSuccess: boolean;
  statusCode: number;
  result: T | null;
  errorMessages: string[];
}
