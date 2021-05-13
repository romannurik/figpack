import { createMainThreadMessenger } from 'figma-messenger';

const messenger = createMainThreadMessenger<Cmd1MainToIframe, Cmd1IframeToMain>();

export default function cmd1() {
  figma.showUI(__html__, { width: 400, height: 300 });
  messenger.on('save', async ({ result }) => {
    figma.notify(`Result: ${result}`);
    figma.closePlugin();
  });
  messenger.on('cancel', () => figma.closePlugin());
  messenger.send('init', { initialValue: 'Hello world' });
}
