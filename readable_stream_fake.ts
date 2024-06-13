import { Readable } from "stream";

export class ReadableStreamFake extends Readable {
  private counter = 0;

  public constructor(private chunks: Array<string>) {
    super();
  }

  public _read(): void {
    if (this.counter < this.chunks.length) {
      this.push(this.chunks[this.counter]);
      this.counter += 1;
    } else {
      this.push(null);
    }
  }
}
