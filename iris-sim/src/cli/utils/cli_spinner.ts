export function startSpinner(msg: string): () => void {
  const frames = ['⏳', '⌛'];
  let i = 0;
  process.stdout.write(`${frames[i]} ${msg}`);
  const timer = setInterval(() => {
    i = (i + 1) % frames.length;
    process.stdout.write(`\r${frames[i]} ${msg}`);
  }, 120);
  return () => {
    clearInterval(timer);
    process.stdout.write('\r');
  };
}

