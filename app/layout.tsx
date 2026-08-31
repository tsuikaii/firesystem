import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL('https://hszhe9.com'),
  title: '社会消防综合服务（陕西）中心',
  description: '实时监测、智能预警、闭环处置的一体化智慧消防演示平台。',
  openGraph: {
    title: '社会消防综合服务（陕西）中心',
    description: '实时监测、智能预警、闭环处置的一体化智慧消防演示平台。',
    images: [{ url: '/og.png', width: 1200, height: 630, alt: '社会消防综合服务（陕西）中心' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: '社会消防综合服务（陕西）中心',
    description: '实时监测、智能预警、闭环处置的一体化智慧消防演示平台。',
    images: ['/og.png'],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
