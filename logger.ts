export interface Logger {
  info(str: string): void;
  error(str: string): void;
}

export class ConsoleLogger {
  public info(str: string): void {
    console.info(str);
  }
  public error(str: string): void {
    console.error(str);
  }
}
