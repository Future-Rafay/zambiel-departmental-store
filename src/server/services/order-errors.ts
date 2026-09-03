export class OrderError extends Error {
  constructor(public code: string) {
    super(code);
  }
}
