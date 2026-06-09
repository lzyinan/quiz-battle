import html2canvas from 'html2canvas';

export async function captureAndDownload(
  element: HTMLElement,
  filename = 'quiz-result.png',
): Promise<void> {
  const canvas = await html2canvas(element, {
    scale: 2,
    backgroundColor: null,
    useCORS: true,
    logging: false,
  });

  const link = document.createElement('a');
  link.download = filename;
  link.href = canvas.toDataURL('image/png');
  link.click();
}

export async function captureToBlob(element: HTMLElement): Promise<Blob | null> {
  const canvas = await html2canvas(element, {
    scale: 2,
    backgroundColor: null,
    useCORS: true,
    logging: false,
  });

  return new Promise((resolve) => {
    canvas.toBlob(resolve, 'image/png');
  });
}
