export class RejectionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RejectionError";
  }
}
