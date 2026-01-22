export {};

declare global {
  interface Window {
    electronAPI: {
      setIgnoreMouseEvents: (ignore: boolean) => void;
      resizeWindow: (width: number, height: number) => void;
      closeWindow: () => void;
    }
  }
}
