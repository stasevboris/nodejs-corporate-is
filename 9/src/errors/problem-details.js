export class ProblemDetailsException extends Error {
  constructor(status, title, detail, type = 'about:blank', invalidParams = null) {
    super(detail);
    this.status = status;
    this.title = title;
    this.detail = detail;
    this.type = type;
    this.invalidParams = invalidParams;
  }

  toJSON(instance = '') {
    return {
      type: this.type,
      title: this.title,
      status: this.status,
      detail: this.detail,
      instance,
      ...(this.invalidParams ? { invalidParams: this.invalidParams } : {})
    };
  }
}
