interface Cmd1MainToIframe {
  init(args: { initialValue: string });
}

interface Cmd1IframeToMain {
  save(args: { result: string });
  cancel();
}
